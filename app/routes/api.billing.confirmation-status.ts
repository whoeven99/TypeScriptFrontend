import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { APP_SUBSCRIPTION_STATUS } from "~/server/billing/types.server";

/**
 * GET /api/billing/confirmation-status?planName=Basic&interval=EVERY_30_DAYS
 *
 * 只读轮询接口：判断商家是否已完成指定套餐（名称 + 计费周期）的订阅确认。
 * 用于定价页「新标签页结账 + 自动刷新」流程 —— Shopify 结账页无法嵌进
 * 弹窗 iframe（官方托管页有 X-Frame-Options/CORS 限制），因此以轮询代替。
 *
 * interval 可选：EVERY_30_DAYS | ANNUAL，不传则只按名称匹配。
 *
 * 返回字段：
 * - shopifyMatched：Shopify activeSubscriptions 已出现目标订阅（支付已确认的快速信号）。
 * - tsfMatched：Turso AppSubscription（webhook 入账后）已是目标订阅。
 * - matched：与 tsfMatched 相同 —— 页面刷新后展示的 plan 来自 Turso，
 *   因此「自动刷新」以 Turso 为准，避免刷新后仍显示旧套餐的竞态；
 *   Shopify 查询失败（网络/权限）时该信号仍然可用。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planName = url.searchParams.get("planName")?.trim();
  const interval = url.searchParams.get("interval")?.trim();

  // interval 参数是 Shopify 侧值；Turso 侧使用 MONTHLY | ANNUAL。
  const tsfInterval =
    interval === "ANNUAL" ? "ANNUAL" : interval ? "MONTHLY" : null;

  let shopifyMatched = false;
  try {
    const response = await admin.graphql(`#graphql
      query ActiveAppSubscriptionsForConfirmation {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing {
                    interval
                  }
                }
              }
            }
          }
        }
      }`);
    const data = await response.json();
    const subscriptions: Array<{
      id: string;
      name: string;
      status: string;
      interval: string | null;
    }> = (data?.data?.currentAppInstallation?.activeSubscriptions ?? []).map(
      (sub: any) => ({
        id: sub.id,
        name: sub.name,
        status: sub.status,
        interval:
          sub.lineItems?.[0]?.plan?.pricingDetails?.interval ?? null,
      }),
    );

    shopifyMatched = Boolean(
      planName &&
        subscriptions.some(
          (sub) =>
            sub.name === planName &&
            sub.status === "ACTIVE" &&
            (!interval || sub.interval === interval),
        ),
    );
  } catch (error) {
    // Shopify 查询失败不影响 Turso 侧检测，继续走 webhook 入账信号。
    console.error("[billing confirmation-status] shopify check failed:", error);
  }

  let tsfMatched = false;
  try {
    const sub = await prisma.appSubscription.findUnique({
      where: { shop: session.shop },
    });
    if (sub && sub.status === APP_SUBSCRIPTION_STATUS.ACTIVE && planName) {
      const catalog = await prisma.planCatalog.findUnique({
        where: { planKey: sub.planKey },
      });
      tsfMatched =
        catalog?.shopifyPlanName === planName &&
        (!tsfInterval || sub.billingInterval === tsfInterval);
    }
  } catch (error) {
    console.error("[billing confirmation-status] tsf check failed:", error);
  }

  return json({
    ok: true,
    matched: tsfMatched,
    tsfMatched,
    shopifyMatched,
  });
};
