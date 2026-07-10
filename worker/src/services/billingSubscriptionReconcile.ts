/**
 * 定时触发 TSF 订阅对账（与 APP_SUBSCRIPTIONS_UPDATE webhook 同路径入账）。
 * 需配置 TSF_SERVER_URL。
 */
export async function runBillingSubscriptionReconcile(): Promise<void> {
  const base = process.env.TSF_SERVER_URL?.trim();
  if (!base) {
    console.warn("[billingReconcile] skip: TSF_SERVER_URL not set");
    return;
  }

  const url = `${base.replace(/\/+$/, "")}/api/cron/billing-subscription-reconcile`;
  const started = Date.now();
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = (await resp.json().catch(() => null)) as
      | {
          ok?: boolean;
          scanned?: number;
          renewed?: number;
          activated?: number;
          cancelled?: number;
          skipped?: number;
          errors?: number;
          error?: string;
        }
      | null;

    if (!resp.ok) {
      console.error(
        `[billingReconcile] HTTP ${resp.status} ${body?.error ?? ""} (${Date.now() - started}ms)`,
      );
      return;
    }

    console.log(
      `[billingReconcile] ok scanned=${body?.scanned ?? "?"} renewed=${body?.renewed ?? "?"} activated=${body?.activated ?? "?"} cancelled=${body?.cancelled ?? "?"} skipped=${body?.skipped ?? "?"} errors=${body?.errors ?? "?"} (${Date.now() - started}ms)`,
    );
  } catch (err) {
    console.error("[billingReconcile] request failed:", err);
  }
}
