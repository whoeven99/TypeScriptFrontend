import { json, type ActionFunctionArgs } from "@remix-run/node";
import { runSubscriptionReconciliation } from "~/server/billing/subscription/reconcileSubscription.server";

/**
 * POST /api/cron/billing-subscription-reconcile
 * Worker 定时调用：对比 Shopify 订阅周期，补齐 webhook 漏掉的续费入账。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  const summary = await runSubscriptionReconciliation();
  return json({ ok: true, ...summary });
};
