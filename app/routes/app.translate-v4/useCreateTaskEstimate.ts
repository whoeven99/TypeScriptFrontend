import { useEffect, useState } from "react";
import type { LocaleCoverageRow } from "~/server/translateV4/coverage.server";

export type CreateTaskEstimateView = {
  estimatedCredits: number | null;
  remainingCredits: number;
  isUpperBound: boolean;
  needsMoreCredits: boolean;
  loading: boolean;
};

const EMPTY_ESTIMATE: CreateTaskEstimateView = {
  estimatedCredits: null,
  remainingCredits: 0,
  isUpperBound: false,
  needsMoreCredits: false,
  loading: false,
};

/** 从覆盖率行推导未译比例（0=已全译，1=全未译；未知为 null）。 */
export function buildUntranslatedRatioByLocale(
  locales: LocaleCoverageRow[],
): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const row of locales) {
    const pct =
      row.storePercent != null
        ? row.storePercent
        : row.cacheMissing
          ? null
          : row.percent;
    map[row.locale] =
      pct == null ? null : Math.min(1, Math.max(0, (100 - pct) / 100));
  }
  return map;
}

/**
 * 创建任务卡额度预估：targets / modules / isCover 变化时防抖请求
 * POST /api/translate-v4/estimate。
 */
export function useCreateTaskEstimate(args: {
  modules: string[];
  targets: string[];
  isCover: boolean;
  untranslatedRatioByLocale: Record<string, number | null>;
  remainingCredits: number | null;
}): CreateTaskEstimateView {
  const { modules, targets, isCover, untranslatedRatioByLocale, remainingCredits } =
    args;
  const [estimate, setEstimate] =
    useState<CreateTaskEstimateView>(EMPTY_ESTIMATE);

  useEffect(() => {
    if (targets.length === 0 || modules.length === 0) {
      setEstimate((prev) => ({
        ...prev,
        estimatedCredits: null,
        remainingCredits: remainingCredits ?? prev.remainingCredits,
        loading: false,
        needsMoreCredits: false,
        isUpperBound: false,
      }));
      return;
    }

    let cancelled = false;
    setEstimate((prev) => ({ ...prev, loading: true }));
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/translate-v4/estimate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modules,
              targets,
              isCover,
              untranslatedRatioByLocale,
            }),
          });
          const text = await res.text();
          const data = text.trim()
            ? (JSON.parse(text) as {
                ok?: boolean;
                estimate?: Omit<CreateTaskEstimateView, "loading">;
              })
            : null;
          if (cancelled) return;
          if (data?.ok && data.estimate) {
            setEstimate({
              estimatedCredits: data.estimate.estimatedCredits,
              remainingCredits: data.estimate.remainingCredits,
              isUpperBound: data.estimate.isUpperBound,
              needsMoreCredits: data.estimate.needsMoreCredits,
              loading: false,
            });
          } else {
            setEstimate((prev) => ({
              ...prev,
              estimatedCredits: null,
              loading: false,
            }));
          }
        } catch (err) {
          console.warn("[translateV4] estimate fetch failed:", err);
          if (!cancelled) {
            setEstimate((prev) => ({
              ...prev,
              estimatedCredits: null,
              loading: false,
            }));
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [targets, modules, isCover, untranslatedRatioByLocale, remainingCredits]);

  return estimate;
}
