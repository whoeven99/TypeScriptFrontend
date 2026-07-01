/**
 * 语言页「每语言状态/自动开关」——统一走 v4 TSF API。
 * 返回形状对齐 Java GetLanguageList：{ success, response: [{ target, status, autoTranslate }] }
 */
export async function listLanguageStatusCompat(_args: {
  shop: string;
  server: string;
  source: string;
}) {
  const res = await fetch("/api/translate-v4/target-locale");
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
