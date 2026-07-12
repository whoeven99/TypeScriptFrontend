/**
 * 语言页状态口径：覆盖率结果 + 活跃任务中的翻译态。
 */
export async function listLanguageCoverageCompat() {
  const res = await fetch("/api/translate-v4/coverage?cache=1&signals=minimal");
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
