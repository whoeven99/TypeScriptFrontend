import prisma from "~/db.server";
import { getOfflineSessionAccessToken } from "~/server/shop/offlineSessionToken.server";
import { resolveShopPrimaryLocale } from "~/server/translateV4/shopLocales.server";
import {
  translateSingleText,
  deductQuota,
} from "~/server/translateV4/singleTranslate.server";
import { getShopCreditQuota } from "~/server/billing/quota/quotaRouter.server";
import { getTranslateV4RedisClient } from "~/server/translateV4/redis.server";

/**
 * 店面自动抓取：switcher 把页面上未翻译的第三方文本回传，
 * 服务端过滤 / 去重 / 额度守卫后异步翻译，写入 LiquidRule(source="auto")。
 * 下次访问由现有 `CustomLiquidTextTranslate` 读 parseLiquid 并替换（最终一致）。
 *
 * 与人工 Liquid 规则共表，仅以 `source` 区分来源。
 */

const MAX_TEXT_LEN = 200;
const MIN_TEXT_LEN = 2;
/** 单次请求最多新翻译多少条，避免一次采集打爆额度。 */
const MAX_PER_REQUEST = 25;
/** 每店每日新翻译上限（跨实例，Redis 计数，24h TTL）。 */
const DAILY_CAP = Number(process.env.AUTO_LIQUID_DAILY_CAP || 500);
const DAILY_CAP_TTL_SEC = 60 * 60 * 25;

export type CollectResult = {
  /** 本次真正安排翻译的条数（异步完成，下次访问生效）。 */
  scheduled: number;
  /** 未启用 / 主语言 / 无候选时为 true，便于客户端停止上报。 */
  skipped: boolean;
  reason?: string;
};

function normalize(text: string): string {
  return String(text || "").replace(/\s+/g, " ").trim();
}

const URL_RE = /^(https?:\/\/|www\.|\/|mailto:|tel:)/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 纯数字 / 价格 / 日期 / 尺码配置等非人工文本。 */
const NON_HUMAN_RE = /^[\d\s.,:/#$€£¥%+\-–—()[\]{}|*·•]+$/;

/** 判断一段文本是否值得送去翻译（粗筛，成本/质量双重保护）。 */
function looksTranslatable(text: string): boolean {
  const t = normalize(text);
  if (t.length < MIN_TEXT_LEN || t.length > MAX_TEXT_LEN) return false;
  // 必须包含至少一个字母（含 CJK / 各语言字母）
  if (!/\p{L}/u.test(t)) return false;
  if (URL_RE.test(t) || EMAIL_RE.test(t)) return false;
  if (NON_HUMAN_RE.test(t)) return false;
  // Liquid / 模板 / 代码碎片
  if (t.includes("{{") || t.includes("}}") || t.includes("{%")) return false;
  // 明显的变量 / 句柄（无空格且带下划线或连字符的全小写标识）
  if (!/\s/.test(t) && /^[a-z0-9_.-]+$/.test(t)) return false;
  return true;
}

function todayKey(shop: string): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  return `tsf:auto_liquid:count:${shop}:${ymd}`;
}

/** 预留本次可翻译名额（Redis 原子 INCRBY + TTL），返回实际获批的条数。 */
async function reserveDailyBudget(shop: string, want: number): Promise<number> {
  if (want <= 0) return 0;
  try {
    const redis = getTranslateV4RedisClient();
    const key = todayKey(shop);
    const after = await redis.incrby(key, want);
    // 首次写入设置 TTL
    if (after === want) await redis.expire(key, DAILY_CAP_TTL_SEC);
    if (after <= DAILY_CAP) return want;
    // 超额：回退超出部分，只保留额度内的名额
    const allowed = Math.max(0, want - (after - DAILY_CAP));
    if (allowed < want) await redis.decrby(key, want - allowed);
    return allowed;
  } catch (err) {
    // Redis 不可用时退化为不限流（依赖 MAX_PER_REQUEST + 额度守卫兜底）
    console.error("[auto-liquid] daily budget reserve failed:", err);
    return want;
  }
}

export async function collectAutoLiquidStrings(args: {
  shop: string;
  target: string;
  texts: string[];
}): Promise<CollectResult> {
  const shop = args.shop.trim();
  const target = normalize(args.target);
  if (!shop || !target) return { scheduled: 0, skipped: true, reason: "no_target" };

  // 1) opt-in 开关（无配置行 = 默认关）
  const config = await prisma.switcherConfiguration.findUnique({
    where: { shop },
    select: { autoLiquidCollect: true },
  });
  if (!config?.autoLiquidCollect) {
    return { scheduled: 0, skipped: true, reason: "disabled" };
  }

  // 2) 主语言门控：目标语言 == 源语言时无需翻译
  const accessToken = await getOfflineSessionAccessToken(shop);
  let primary: string | null = null;
  if (accessToken) {
    try {
      primary = await resolveShopPrimaryLocale({ shop, accessToken });
    } catch (err) {
      console.error("[auto-liquid] resolve primary locale failed:", err);
    }
  }
  if (primary && normalize(primary).toLowerCase() === target.toLowerCase()) {
    return { scheduled: 0, skipped: true, reason: "primary_locale" };
  }

  // 3) 归一 + 去重 + 粗筛 + 单次上限
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const raw of Array.isArray(args.texts) ? args.texts : []) {
    const t = normalize(raw);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    if (!looksTranslatable(t)) continue;
    candidates.push(t);
    if (candidates.length >= MAX_PER_REQUEST * 2) break; // 预留冗余给去库存
  }
  if (!candidates.length) return { scheduled: 0, skipped: true, reason: "no_candidate" };

  // 4) 去掉已存在的规则（人工或已自动回填）
  const existing = await prisma.liquidRule.findMany({
    where: { shop, languageCode: target, beforeTranslation: { in: candidates } },
    select: { beforeTranslation: true },
  });
  const existingSet = new Set(existing.map((r) => r.beforeTranslation));
  const fresh = candidates
    .filter((t) => !existingSet.has(t))
    .slice(0, MAX_PER_REQUEST);
  if (!fresh.length) return { scheduled: 0, skipped: false, reason: "all_known" };

  // 5) 额度守卫
  const quota = await getShopCreditQuota(shop);
  if (quota && quota.remaining <= 0) {
    return { scheduled: 0, skipped: true, reason: "no_quota" };
  }

  // 6) 每日名额预留
  const allowed = await reserveDailyBudget(shop, fresh.length);
  if (allowed <= 0) return { scheduled: 0, skipped: true, reason: "daily_cap" };
  const toTranslate = fresh.slice(0, allowed);

  // 7) 异步翻译并回填（不阻塞店面响应）
  void translateAndStore({ shop, target, source: primary ?? undefined, texts: toTranslate });

  return { scheduled: toTranslate.length, skipped: false };
}

async function translateAndStore(args: {
  shop: string;
  target: string;
  source?: string;
  texts: string[];
}): Promise<void> {
  for (const text of args.texts) {
    try {
      const { translatedText, usedTokens } = await translateSingleText({
        shop: args.shop,
        target: args.target,
        text,
        source: args.source,
        fieldKey: "auto_liquid",
      });
      const translated = normalize(translatedText);
      // 空 / 与原文一致（多为已是目标语言）→ 不入库
      if (!translated || translated === normalize(text)) continue;

      // 唯一键冲突（并发同串 / 已存在）时直接覆盖译文，不抛错。
      await prisma.liquidRule.upsert({
        where: {
          shop_languageCode_beforeTranslation: {
            shop: args.shop,
            languageCode: args.target,
            beforeTranslation: text,
          },
        },
        create: {
          shop: args.shop,
          beforeTranslation: text,
          afterTranslation: translatedText,
          languageCode: args.target,
          replacementMethod: true,
          source: "auto",
        },
        update: {
          afterTranslation: translatedText,
        },
      });
      if (usedTokens > 0) await deductQuota(args.shop, usedTokens);
    } catch (err) {
      console.error("[auto-liquid] translate/store failed:", err);
    }
  }
}
