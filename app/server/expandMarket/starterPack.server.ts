import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { getLatestShopScanJob } from "~/server/shopScan/cosmos.server";
import prisma from "~/db.server";
import { PLAN_KIND } from "~/server/billing/types.server";
import { getTsfBootstrapData } from "~/server/billing/bootstrap/getTsfBootstrapData.server";
import { eNumPlanType } from "~/lib/creditPackPricing";
import {
  matchPackForCredits,
  type StarterPackEstimate,
  type StarterProduct,
} from "~/lib/expandMarket";
import { estimateCreditsFromChars } from "~/server/translateV4/creditEstimate.server";

export type { StarterPackEstimate, StarterProduct } from "~/lib/expandMarket";

type AdminGraphql = Pick<AdminApiContext, "graphql">;

/** 店面验收卡片最多展示的商品数（翻译范围为全部商品，不受此限制）。 */
export const EXPAND_PREVIEW_PRODUCT_N = 20;

/** 无 scan 时，单商品粗估额度（偏保守，含 prompt 开销）。 */
const FALLBACK_CREDITS_PER_PRODUCT = 2500;

/**
 * 无全模块 scan 时：全店其它模块粗估 ≈ 商品额度 × 系数。
 * 仅展示用，实扣以 worker token 为准。
 */
const FULL_STORE_FALLBACK_MULTIPLIER = 2.5;

function packNameFromShopifyPlanName(shopifyPlanName: string): string {
  return shopifyPlanName.replace(/\s+Credits$/i, "").trim();
}

function emptyEstimate(remainingCredits: number): StarterPackEstimate {
  const remaining = Math.max(0, Math.floor(remainingCredits));
  return {
    n: 0,
    productCount: 0,
    products: [],
    storefrontHomeUrl: null,
    estimatedCredits: 0,
    fullCatalogEstimatedCredits: null,
    fullStoreEstimatedCredits: null,
    usedShopScan: false,
    scanProductChars: null,
    remainingCredits: remaining,
    needsPurchase: false,
    recommendedPack: null,
    recommendedFullStorePack: null,
    packs: [],
  };
}

function resolveStorefrontHomeUrl(
  primaryDomainUrl: string | null,
  shopDomain: string,
): string | null {
  const raw =
    primaryDomainUrl?.trim() ||
    (shopDomain.trim() ? `https://${shopDomain.trim()}` : "");
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}

/**
 * 商品店面 URL：优先 Shopify onlineStoreUrl；
 * 为空时用 primaryDomain/shopDomain + handle 兜底拼出商品页。
 * 注意：onlineStoreUrl 对不少已发布商品也会返回 null（字段不可靠），
 * 因此必须保留 handle 兜底，否则大量可打开的商品会被误判为不可预览。
 */
function productStoreUrl(
  onlineStoreUrl: string | null | undefined,
  handle: string | undefined,
  primaryDomainUrl: string | null,
  shopDomain?: string | null,
): string | null {
  if (onlineStoreUrl) return onlineStoreUrl;
  if (!handle) return null;
  const raw =
    primaryDomainUrl?.trim() ||
    (shopDomain?.trim() ? `https://${shopDomain.trim()}` : "");
  if (!raw) return null;
  const base = raw.replace(/\/$/, "");
  const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  return `${withScheme}/products/${handle}`;
}

async function loadShopPrimaryDomain(admin: AdminGraphql): Promise<string | null> {
  try {
    const response = await admin.graphql(
      `#graphql
        query ExpandStarterShopDomain {
          shop {
            primaryDomain { url }
          }
        }
      `,
    );
    const json = (await response.json()) as {
      data?: { shop?: { primaryDomain?: { url?: string | null } | null } };
    };
    return json.data?.shop?.primaryDomain?.url ?? null;
  } catch {
    return null;
  }
}

async function loadProductCount(admin: AdminGraphql): Promise<number> {
  try {
    const response = await admin.graphql(
      `#graphql
        query ExpandStarterProductCount {
          productsCount {
            count
          }
        }
      `,
    );
    const json = (await response.json()) as {
      data?: { productsCount?: { count?: number } };
    };
    return Number(json.data?.productsCount?.count) || 0;
  } catch (err) {
    console.warn("[expandStarter] productsCount failed:", err);
    return 0;
  }
}

/** 预览用：取最多 N 个热销商品卡片（翻译仍覆盖全部商品）。 */
async function loadPreviewProducts(
  admin: AdminGraphql,
  n: number,
  primaryDomainUrl: string | null,
  shopDomain?: string | null,
): Promise<StarterProduct[]> {
  if (n <= 0) return [];

  const tryQuery = async (sortKey: string | null) => {
    try {
      const response = await admin.graphql(
        `#graphql
          query ExpandStarterProducts($first: Int!, $sortKey: ProductSortKeys) {
            products(first: $first, sortKey: $sortKey) {
              nodes {
                id
                title
                handle
                onlineStorePreviewUrl
                onlineStoreUrl
                featuredImage { url }
              }
            }
          }
        `,
        { variables: { first: n, sortKey } },
      );
      const json = (await response.json()) as {
        data?: {
          products?: {
            nodes?: Array<{
              id: string;
              title?: string | null;
              handle?: string | null;
              onlineStorePreviewUrl?: string | null;
              onlineStoreUrl?: string | null;
              featuredImage?: { url?: string | null } | null;
            }>;
          };
        };
        errors?: unknown;
      };
      if (json.errors) {
        console.warn("[expandStarter] products query errors:", sortKey, json.errors);
        return null;
      }
      return (json.data?.products?.nodes ?? []).map((p) => ({
        id: p.id,
        title: p.title ?? "",
        handle: p.handle ?? "",
        onlineStorePreviewUrl: p.onlineStorePreviewUrl ?? null,
        onlineStoreUrl: productStoreUrl(
          p.onlineStoreUrl,
          p.handle ?? undefined,
          primaryDomainUrl,
          shopDomain,
        ),
        imageUrl: p.featuredImage?.url ?? null,
      }));
    } catch (err) {
      console.warn("[expandStarter] products query threw:", sortKey, err);
      return null;
    }
  };

  const best = await tryQuery("BEST_SELLING");
  if (best && best.length) return best.slice(0, n);
  const updated = await tryQuery("UPDATED_AT");
  if (updated && updated.length) return updated.slice(0, n);
  const plain = await tryQuery(null);
  return (plain ?? []).slice(0, n);
}

async function listEnabledPacks(planType: string, isInTrial: boolean) {
  try {
    const rows = await prisma.planCatalog.findMany({
      where: { kind: PLAN_KIND.ONE_TIME_PACK, enabled: true },
      orderBy: { sortOrder: "asc" },
      select: {
        planKey: true,
        shopifyPlanName: true,
        credits: true,
        currencyCode: true,
      },
    });
    return rows
      .filter((r) => Boolean(r.shopifyPlanName))
      .map((r) => {
        const packName = packNameFromShopifyPlanName(r.shopifyPlanName as string);
        const price = eNumPlanType({
          planType,
          optionName: packName,
          isInTrial,
        });
        return {
          planKey: r.planKey,
          packName,
          credits: r.credits,
          priceAmount: price.currentPrice,
          comparedPrice: price.comparedPrice,
          currencyCode: price.currencyCode || r.currencyCode || "USD",
        };
      });
  } catch (err) {
    console.error("[expandStarter] listEnabledPacks failed:", err);
    return [];
  }
}

function sumScanChars(
  moduleStats: Record<string, { items?: number; chars?: number }> | undefined,
): { productChars: number | null; allChars: number | null } {
  if (!moduleStats || typeof moduleStats !== "object") {
    return { productChars: null, allChars: null };
  }
  const product = moduleStats.PRODUCT;
  const productChars =
    product && typeof product.chars === "number" ? product.chars : null;
  let all = 0;
  let any = false;
  for (const v of Object.values(moduleStats)) {
    if (v && typeof v.chars === "number") {
      all += v.chars;
      any = true;
    }
  }
  return { productChars, allChars: any ? all : null };
}

/**
 * 开拓市场商品起步包：一次性译全部 PRODUCT（含选项），粗估额度并推荐加量包。
 * `products` 仅为店面验收预览样本，不是翻译上限。
 */
export async function buildStarterPackEstimate(args: {
  shop: string;
  admin: AdminGraphql;
  remainingCredits: number;
}): Promise<StarterPackEstimate> {
  try {
    const [productCount, primaryDomain, bootstrap] = await Promise.all([
      loadProductCount(args.admin),
      loadShopPrimaryDomain(args.admin),
      getTsfBootstrapData(args.shop).catch(() => null),
    ]);
    const n = productCount;
    const previewN = Math.min(EXPAND_PREVIEW_PRODUCT_N, productCount);
    const products = await loadPreviewProducts(
      args.admin,
      previewN,
      primaryDomain,
      args.shop,
    );

    const scan = await getLatestShopScanJob(args.shop).catch(() => null);
    const { productChars: scanProductChars, allChars: scanAllChars } =
      sumScanChars(scan?.summary?.moduleStats);

    let estimatedCredits: number;
    let fullCatalogEstimatedCredits: number | null = null;
    let fullStoreEstimatedCredits: number | null = null;
    let usedShopScan = false;

    if (scanProductChars != null && productCount > 0) {
      usedShopScan = true;
      estimatedCredits = estimateCreditsFromChars(scanProductChars);
      fullCatalogEstimatedCredits = estimatedCredits;
    } else if (productCount > 0) {
      estimatedCredits = Math.max(1, productCount * FALLBACK_CREDITS_PER_PRODUCT);
      fullCatalogEstimatedCredits = estimatedCredits;
    } else {
      estimatedCredits = 0;
    }

    if (scanAllChars != null && scanAllChars > 0) {
      usedShopScan = true;
      fullStoreEstimatedCredits = estimateCreditsFromChars(scanAllChars);
    } else if (estimatedCredits > 0) {
      fullStoreEstimatedCredits = Math.max(
        estimatedCredits,
        Math.ceil(estimatedCredits * FULL_STORE_FALLBACK_MULTIPLIER),
      );
    }

    const planType = bootstrap?.plan?.type ?? "Free";
    const isInTrial = Boolean(bootstrap?.plan?.isInFreePlanTime);
    const packs = await listEnabledPacks(planType, isInTrial);
    const remaining = Math.max(0, Math.floor(args.remainingCredits));
    const needsPurchase = estimatedCredits > 0 && remaining < estimatedCredits;
    const recommendedPack = matchPackForCredits(packs, estimatedCredits);
    const recommendedFullStorePack = matchPackForCredits(
      packs,
      fullStoreEstimatedCredits ?? 0,
    );

    return {
      n,
      productCount,
      products,
      storefrontHomeUrl: resolveStorefrontHomeUrl(primaryDomain, args.shop),
      estimatedCredits,
      fullCatalogEstimatedCredits,
      fullStoreEstimatedCredits,
      usedShopScan,
      scanProductChars,
      remainingCredits: remaining,
      needsPurchase,
      recommendedPack,
      recommendedFullStorePack,
      packs,
    };
  } catch (err) {
    console.error("[expandStarter] buildStarterPackEstimate failed:", err);
    return emptyEstimate(args.remainingCredits);
  }
}

/** @deprecated 保留导出以免外部引用；起步包已改为译全部商品。 */
export const EXPAND_STARTER_DEFAULT_N = EXPAND_PREVIEW_PRODUCT_N;

/** @deprecated 起步包不再按 N 截断。 */
export function resolveStarterN(productCount: number): number {
  return Math.max(0, Math.floor(productCount));
}
