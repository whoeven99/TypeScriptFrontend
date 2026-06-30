/**
 * TSF 侧 IP 定位业务逻辑（port 自 Java UserIpService）。
 *
 * 本文件仅在 isShopIpMigrated(shop) === true 时被调用；
 * 未迁移店的请求由 api.storefront.$.ts 直接透传到 Java。
 */
import prisma from "~/db.server";

// ──────────────────────────────────────────────────────────────────────────────
// 类型定义（与 Java IpRedirectionVO 对齐）
// ──────────────────────────────────────────────────────────────────────────────

export interface IpRedirectionVO {
  id: number;
  region: string;
  languageCode: string;
  currencyCode: string;
}

export interface CheckUserIpResult {
  success: boolean;
  errorCode: number | null;
  errorMsg: string | null;
  /** 额度充足时为 IpRedirectionVO[]，超额时为 null（Java 行为一致） */
  response: IpRedirectionVO[] | null;
}

export interface NoCrawlerLogData {
  status: string;
  userIp?: string;
  languageCode?: string;
  languageCodeStatus?: boolean;
  countryCode?: string;
  currencyCode?: string;
  currencyCodeStatus?: boolean;
  costTime?: number;
  ipApiCostTime?: number;
  errorMessage?: string;
}

export interface CrawlerLogData {
  uaInformation?: string;
  uaReason?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// IP 额度档位（port 自 Java UserIpService，MULTIPLIER=5）
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 根据订阅计划 ID 返回免费 IP 定位次数上限。
 * Java 原逻辑：默认 500×5=2500；plan 4→4000×5；plan 5→5500×5；plan 6→7000×5。
 * 当前 TSF 暂无订阅计划表（ShopSubscription 尚未迁移），
 * 先用固定默认值 2500；后续接入 ShopSubscription 后改为按 planId 查询。
 */
function getFreeIpLimit(_planId?: number): bigint {
  return BigInt(2500);
}

// ──────────────────────────────────────────────────────────────────────────────
// checkUserIp
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 检查当前店铺 IP 定位额度是否充足。
 *
 * 成功（额度充足）：response 为 IpRedirectionVO[]（含店铺的所有 IP 重定向规则）。
 * 失败（超额或无配置）：success=false。
 *
 * Java 行为还原：
 *   1. 读 ShopIpQuota.times；未命中则创建（times=0）。
 *   2. times < freeLimit → 直接通过（INCR times，更新 allTimes）。
 *   3. times >= freeLimit → 检查翻译额度（ShopQuotaCounter.usedToken < maxToken）才放行。
 *      （翻译额度表尚未在本期迁移，暂时：超 freeLimit 后仍放行，待额度表就绪后补齐）
 *   4. 通过后返回该店的 IpRedirection 列表。
 */
export async function checkUserIp(shop: string): Promise<CheckUserIpResult> {
  try {
    const [quota, redirections] = await Promise.all([
      prisma.shopIpQuota.upsert({
        where: { shop },
        create: { shop },
        update: {},
      }),
      prisma.ipRedirection.findMany({
        where: { shop, isDeleted: false },
        select: { id: true, region: true, languageCode: true, currencyCode: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const freeLimit = getFreeIpLimit();
    const currentTimes = quota.times;
    const allowed = currentTimes < freeLimit;

    if (!allowed) {
      // 超出免费档位：Java 此时再检查翻译 quota，TSF 暂放行（TODO: 接入 ShopQuotaCounter）
      console.warn(
        `[ip] shop=${shop} times=${currentTimes} >= freeLimit=${freeLimit}, 暂放行（quota 表待接入）`,
      );
    }

    // 更新次数（行锁版）
    await prisma.shopIpQuota.update({
      where: { shop },
      data: {
        times: { increment: 1 },
        allTimes: { increment: 1 },
      },
    });

    const response: IpRedirectionVO[] = redirections.map((r) => ({
      id: r.id,
      region: r.region,
      languageCode: r.languageCode,
      currencyCode: r.currencyCode,
    }));

    return { success: true, errorCode: null, errorMsg: null, response };
  } catch (err) {
    console.error(`[ip] checkUserIp failed shop=${shop}:`, err);
    return { success: false, errorCode: 10001, errorMsg: "internal error", response: null };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 日志
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 记录非爬虫用户的 IP 定位日志（port 自 Java noCrawlerPrintLog）。
 * 当前实现为结构化 console.log；后续可写入 Turso ShopIpStat 表或 Cosmos。
 * 异步执行，不阻塞响应。
 */
export async function logNoCrawler(
  shop: string,
  data: NoCrawlerLogData,
): Promise<void> {
  console.log("[ip][noCrawler]", JSON.stringify({ shop, ...data }));
}

/**
 * 记录疑似爬虫的 UA 日志（port 自 Java includeCrawlerPrintLog）。
 * 当前为 console.log；后续可写入专用日志表。
 */
export async function logIncludeCrawler(
  shop: string,
  data: CrawlerLogData,
): Promise<void> {
  console.log("[ip][crawler]", JSON.stringify({ shop, ...data }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin CRUD（供 app.switcher_.custom_redirects/route.tsx 调用）
// ──────────────────────────────────────────────────────────────────────────────

export interface SyncIpInput {
  region: string;
  languageCode: string;
  currencyCode: string;
}

/**
 * 批量同步 IP 重定向规则（port 自 Java UserIpService.syncUserIp）。
 * 按 (shop, region) 做 upsert；返回当前所有未删除规则。
 */
export async function syncIpRedirections(
  shop: string,
  initData: SyncIpInput[],
): Promise<IpRedirectionVO[]> {
  for (const item of initData) {
    const existing = await prisma.ipRedirection.findFirst({
      where: { shop, region: item.region, isDeleted: false },
    });

    if (existing) {
      await prisma.ipRedirection.update({
        where: { id: existing.id },
        data: {
          languageCode: item.languageCode,
          currencyCode: item.currencyCode,
        },
      });
    } else {
      const maxRecord = await prisma.ipRedirection.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      const nextId = (maxRecord?.id ?? 0) + 1;
      await prisma.ipRedirection.create({
        data: {
          id: nextId,
          shop,
          region: item.region,
          languageCode: item.languageCode,
          currencyCode: item.currencyCode,
        },
      });
    }
  }

  const rows = await prisma.ipRedirection.findMany({
    where: { shop, isDeleted: false },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    region: r.region,
    languageCode: r.languageCode,
    currencyCode: r.currencyCode,
  }));
}

export interface UpdateIpInput {
  id: number;
  region: string;
  languageCode: string;
  currencyCode: string;
}

/**
 * 更新单条 IP 重定向规则（port 自 Java UserIpService.updateUserIp）。
 */
export async function updateIpRedirection(
  shop: string,
  input: UpdateIpInput,
): Promise<IpRedirectionVO | null> {
  try {
    const updated = await prisma.ipRedirection.update({
      where: { id: input.id, shop },
      data: {
        region: input.region,
        languageCode: input.languageCode,
        currencyCode: input.currencyCode,
      },
    });
    return {
      id: updated.id,
      region: updated.region,
      languageCode: updated.languageCode,
      currencyCode: updated.currencyCode,
    };
  } catch (err) {
    console.error(`[ip] updateIpRedirection failed shop=${shop} id=${input.id}:`, err);
    return null;
  }
}

/**
 * 查询该店 IP 定位已用次数（port 自 Java queryUserIpCount）。
 */
export async function queryIpCount(shop: string): Promise<bigint> {
  const quota = await prisma.shopIpQuota.findUnique({
    where: { shop },
    select: { allTimes: true },
  });
  return quota?.allTimes ?? BigInt(0);
}
