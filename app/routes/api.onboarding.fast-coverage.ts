import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  buildFastCoverageSnapshot,
  isOnboardingFastCoverageLabel,
  ONBOARDING_FAST_COVERAGE_LABELS,
  refreshOnboardingFastCoverageLabel,
} from "~/server/onboarding/fastCoverage.server";

/**
 * POST /api/onboarding/fast-coverage
 * body: { locale, localeLabel?, label }
 *
 * 逐个刷新「最重要语言」的单个模块 label，供 Preparing 真进度驱动。
 * 只写 Redis module 明细，不写 Turso 语言级汇总。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as {
    locale?: unknown;
    localeLabel?: unknown;
    label?: unknown;
    /** 客户端已累计完成的 labels（用于拼完整 snapshot） */
    doneLabels?: unknown;
  };

  const locale = typeof body.locale === "string" ? body.locale.trim() : "";
  if (!locale) {
    return json({ ok: false, error: "locale required" }, { status: 400 });
  }

  const labelRaw = typeof body.label === "string" ? body.label.trim() : "";
  if (!isOnboardingFastCoverageLabel(labelRaw)) {
    return json(
      {
        ok: false,
        error: "invalid label",
        allowed: [...ONBOARDING_FAST_COVERAGE_LABELS],
      },
      { status: 400 },
    );
  }

  const localeLabel =
    typeof body.localeLabel === "string" && body.localeLabel.trim()
      ? body.localeLabel.trim()
      : locale;

  try {
    const justDone = await refreshOnboardingFastCoverageLabel({
      admin,
      shop: session.shop,
      locale,
      label: labelRaw,
    });

    const prior: Array<{ label: string; translated: number; total: number }> = [];
    if (Array.isArray(body.doneLabels)) {
      for (const item of body.doneLabels) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        if (
          typeof row.label === "string" &&
          isOnboardingFastCoverageLabel(row.label) &&
          typeof row.translated === "number" &&
          typeof row.total === "number"
        ) {
          // 同 label 以本次为准，跳过旧值
          if (row.label === justDone.label) continue;
          prior.push({
            label: row.label,
            translated: row.translated,
            total: row.total,
          });
        }
      }
    }

    const labels = [
      ...prior.filter((p) => isOnboardingFastCoverageLabel(p.label)).map((p) => ({
        label: p.label as typeof justDone.label,
        translated: p.translated,
        total: p.total,
      })),
      justDone,
    ];

    // 按固定顺序排列
    const order = new Map(
      ONBOARDING_FAST_COVERAGE_LABELS.map((l, i) => [l, i] as const),
    );
    labels.sort(
      (a, b) => (order.get(a.label) ?? 99) - (order.get(b.label) ?? 99),
    );

    const snapshot = buildFastCoverageSnapshot({
      locale,
      localeLabel,
      labels,
    });

    return json({ ok: true, justDone, snapshot });
  } catch (err) {
    console.error("[onboarding] fast-coverage failed:", err);
    return json({ ok: false, error: "fast coverage failed" }, { status: 500 });
  }
};
