/** 翻译 v4 功能开关：未配置或不为 true/1/yes 时默认关闭。 */
export function isTranslateV4Enabled(): boolean {
  const raw = process.env.TRANSLATE_V4_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
