import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getLatestShopScanJob } from "~/server/shopScan/cosmos.server";
import { isProductionNodeEnv } from "~/config/nodeEnv.server";

/**
 * GET /api/shop-profile —— 店铺画像 + 最近一次扫描状态。
 *
 * 画像（当前生效）读 Turso ShopProfile；扫描进度/汇总读 Cosmos 最新 shop_scan_jobs。
 * 预留给后续 UI（初始化进度页 / 术语表确认引导），本期仅提供查询。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isProductionNodeEnv()) {
    return json({ ok: false, error: "not available" }, { status: 404 });
  }
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const [profileRow, latestScan] = await Promise.all([
      prisma.shopProfile.findUnique({ where: { shop } }),
      getLatestShopScanJob(shop).catch(() => null),
    ]);

    const profile = profileRow
      ? {
          shopName: profileRow.shopName,
          primaryLocale: profileRow.primaryLocale,
          industry: profileRow.industry,
          keywords: Array.isArray(profileRow.keywords)
            ? (profileRow.keywords as string[])
            : [],
          description: profileRow.description,
          brandTone: profileRow.brandTone,
          aiModel: profileRow.aiModel,
          lastScanId: profileRow.lastScanId,
          lastScannedAt: profileRow.lastScannedAt,
        }
      : null;

    const scan = latestScan
      ? {
          scanId: latestScan.id,
          trigger: latestScan.trigger,
          status: latestScan.status,
          stages: latestScan.stages,
          summary: latestScan.summary,
          createdAt: latestScan.createdAt,
          updatedAt: latestScan.updatedAt,
        }
      : null;

    return json({ ok: true, profile, scan });
  } catch (err) {
    console.error("[shop-profile] load failed:", err);
    return json({ ok: false, error: "shop-profile failed" }, { status: 500 });
  }
};
