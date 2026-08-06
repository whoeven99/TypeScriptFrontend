import prisma from "~/db.server";
import { getOfflineSessionAccessToken } from "~/server/shop/offlineSessionToken.server";
import { resolveShopPrimaryLocale } from "~/server/translateV4/shopLocales.server";
import { getTranslateV4RedisClient } from "~/server/translateV4/redis.server";
import { liquidSourceDigest } from "~/server/translateV4/liquidDigest.server";

/**
 * 店面自动抓取：switcher 把页面上未翻译的第三方文本回传，
 * 服务端过滤 / 去重 / 背压后只写入 LiquidRule(status=PENDING, source=auto)。
 * 真正翻译走 v4 任务勾选「自定义 Liquid」→ Worker CUSTOM_LIQUID 管线。
 */

const MAX_TEXT_LEN = 200;
const MIN_TEXT_LEN = 2;
/** 单次请求最多新插入多少条 PENDING。 */
const MAX_PER_REQUEST = 25;
/** 每店每日新增 PENDING 上限（跨实例，Redis 计数）。 */
const DAILY_CAP = Number(process.env.AUTO_LIQUID_DAILY_CAP || 100);
const DAILY_CAP_TTL_SEC = 60 * 60 * 25;
/** 每店 auto 行总量上限（含 PENDING/DONE）；到顶停止新增。 */
const TOTAL_CAP = Number(process.env.AUTO_LIQUID_TOTAL_CAP || 50_000);
const PRIMARY_LOCALE_TTL_SEC = 60 * 60;

export type CollectResult = {
  /** 本次新写入 PENDING 的条数。 */
  scheduled: number;
  /** 未启用 / 主语言 / 无候选时为 true，便于客户端停止上报。 */
  skipped: boolean;
  reason?: string;
};

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return defaultValue;
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  return defaultValue;
}

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
  if (!/\p{L}/u.test(t)) return false;
  if (URL_RE.test(t) || EMAIL_RE.test(t)) return false;
  if (NON_HUMAN_RE.test(t)) return false;
  if (t.includes("{{") || t.includes("}}") || t.includes("{%")) return false;
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

function primaryLocaleCacheKey(shop: string): string {
  return `tsf:shop_primary_locale:${shop}`;
}

/** 预留本次可插入名额（Redis 原子 INCRBY + TTL），返回实际获批的条数。 */
async function reserveDailyBudget(shop: string, want: number): Promise<number> {
  if (want <= 0) return 0;
  try {
    const redis = getTranslateV4RedisClient();
    const key = todayKey(shop);
    const after = await redis.incrby(key, want);
    if (after === want) await redis.expire(key, DAILY_CAP_TTL_SEC);
    if (after <= DAILY_CAP) return want;
    const allowed = Math.max(0, want - (after - DAILY_CAP));
    if (allowed < want) await redis.decrby(key, want - allowed);
    return allowed;
  } catch (err) {
    console.error("[auto-liquid] daily budget reserve failed:", err);
    return want;
  }
}

async function resolvePrimaryLocaleCached(shop: string): Promise<string | null> {
  try {
    const redis = getTranslateV4RedisClient();
    const cached = await redis.get(primaryLocaleCacheKey(shop));
    if (cached) return cached;
  } catch {
    // ignore
  }

  const accessToken = await getOfflineSessionAccessToken(shop);
  if (!accessToken) return null;
  try {
    const primary = await resolveShopPrimaryLocale({ shop, accessToken });
    if (primary) {
      try {
        const redis = getTranslateV4RedisClient();
        await redis.set(primaryLocaleCacheKey(shop), primary, "EX", PRIMARY_LOCALE_TTL_SEC);
      } catch {
        // ignore
      }
    }
    return primary;
  } catch (err) {
    console.error("[auto-liquid] resolve primary locale failed:", err);
    return null;
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

  // 0) 全局 kill-switch（默认开；出事设 AUTO_LIQUID_COLLECT_ENABLED=false）
  // 产品默认采集；不再读 SwitcherConfiguration.autoLiquidCollect 商户开关。
  if (!envBool("AUTO_LIQUID_COLLECT_ENABLED", true)) {
    return { scheduled: 0, skipped: true, reason: "disabled" };
  }

  // 1) 主语言门控（Redis 缓存 1h，避免每会话打 Shopify）
  const primary = await resolvePrimaryLocaleCached(shop);
  if (primary && normalize(primary).toLowerCase() === target.toLowerCase()) {
    return { scheduled: 0, skipped: true, reason: "primary_locale" };
  }

  // 2) 归一 + 去重 + 粗筛 + 单次上限
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const raw of Array.isArray(args.texts) ? args.texts : []) {
    const t = normalize(raw);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    if (!looksTranslatable(t)) continue;
    candidates.push(t);
    if (candidates.length >= MAX_PER_REQUEST * 2) break;
  }
  if (!candidates.length) return { scheduled: 0, skipped: true, reason: "no_candidate" };

  // 3) 去掉已存在的规则（任意 status）
  const existing = await prisma.liquidRule.findMany({
    where: { shop, languageCode: target, beforeTranslation: { in: candidates } },
    select: { beforeTranslation: true },
  });
  const existingSet = new Set(existing.map((r) => r.beforeTranslation));
  const fresh = candidates
    .filter((t) => !existingSet.has(t))
    .slice(0, MAX_PER_REQUEST);
  if (!fresh.length) return { scheduled: 0, skipped: false, reason: "all_known" };

  // 4) 总量上限（只限 source=auto）
  const autoCount = await prisma.liquidRule.count({
    where: { shop, source: "auto" },
  });
  if (autoCount >= TOTAL_CAP) {
    return { scheduled: 0, skipped: true, reason: "total_cap" };
  }
  const room = Math.max(0, TOTAL_CAP - autoCount);
  const withinTotal = fresh.slice(0, room);
  if (!withinTotal.length) {
    return { scheduled: 0, skipped: true, reason: "total_cap" };
  }

  // 5) 每日名额预留（采集只落 PENDING，不扣额度；翻译时再计费）
  const allowed = await reserveDailyBudget(shop, withinTotal.length);
  if (allowed <= 0) return { scheduled: 0, skipped: true, reason: "daily_cap" };
  const toInsert = withinTotal.slice(0, allowed);

  // 6) 批量插入 PENDING（不跑 LLM）
  try {
    const result = await prisma.liquidRule.createMany({
      data: toInsert.map((text) => ({
        shop,
        beforeTranslation: text,
        afterTranslation: "",
        languageCode: target,
        replacementMethod: false,
        source: "auto",
        status: "PENDING",
        sourceDigest: liquidSourceDigest(text),
        jobId: null,
      })),
      skipDuplicates: true,
    });
    return { scheduled: result.count, skipped: false };
  } catch (err) {
    console.error("[auto-liquid] createMany PENDING failed:", err);
    return { scheduled: 0, skipped: true, reason: "write_failed" };
  }
}
