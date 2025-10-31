export function isHTML(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  const trimmed = text.trim();

  // 改进版：支持多行和更宽松匹配
  const htmlPattern =
    /<([a-z][\w-]*)(?:\s[^<>]*)?>[\s\S]*?<\/\1>|<([a-z][\w-]*)(?:\s[^<>]*)?\/?>/i;

  return htmlPattern.test(trimmed);
}
