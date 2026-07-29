/**
 * 语言页状态口径：覆盖率结果 + 活跃任务中的翻译态。
 */
export async function listLanguageCoverageCompat(args?: {
  forceRefresh?: boolean;
  locales?: string[];
}) {
  const params = new URLSearchParams({ signals: "minimal" });
  if (args?.forceRefresh) {
    params.set("refresh", "1");
    if (args.locales?.length) {
      params.set("locales", args.locales.join(","));
    }
  } else {
    params.set("cache", "1");
  }
  const res = await fetch(`/api/translate-v4/coverage?${params.toString()}`);
  return res.json();
}

/** 语言页「按语言自动翻译开关」——统一写 TSF Prisma。 */
export async function setAutoTranslateCompat(args: {
  target: string;
  autoTranslate: boolean;
}) {
  const res = await fetch("/api/translate-v4/target-locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "setAuto",
      locale: args.target,
      autoTranslate: args.autoTranslate,
    }),
  });
  return res.json();
}
