/** 翻译任务成功后通知各页刷新统计（读 Redis 缓存，无需全量重算）。 */

export const TRANSLATION_STATS_UPDATED_EVENT = "tsf:translation-stats-updated";

export type TranslationStatsUpdatedDetail = {
  target: string;
  source?: string;
};

export function notifyTranslationStatsUpdated(
  detail: TranslationStatsUpdatedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TRANSLATION_STATS_UPDATED_EVENT, { detail }),
  );
}

export function onTranslationStatsUpdated(
  listener: (detail: TranslationStatsUpdatedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<TranslationStatsUpdatedDetail>).detail;
    if (detail?.target) listener(detail);
  };
  window.addEventListener(TRANSLATION_STATS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(TRANSLATION_STATS_UPDATED_EVENT, handler);
}
