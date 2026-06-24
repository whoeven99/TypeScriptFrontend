/** locale 代码 → 设计稿中的地区缩写（用于语言标签）。 */
export function localeRegionCode(locale: string): string {
  const map: Record<string, string> = {
    "zh-CN": "CN",
    "zh-TW": "TW",
    en: "GB",
    "en-US": "US",
    "en-GB": "GB",
    ja: "JP",
    fr: "FR",
    de: "DE",
    es: "ES",
    ko: "KR",
    ar: "SA",
    it: "IT",
    pt: "PT",
    nl: "NL",
    ru: "RU",
    sv: "SE",
    tr: "TR",
    uk: "UA",
  };
  if (map[locale]) return map[locale];
  const base = locale.split("-")[0];
  return map[base] ?? base.toUpperCase().slice(0, 2);
}

/** 从 Shopify name 或 label 提取简短中文名。 */
export function localeShortName(locale: string, label?: string): string {
  const byLocale: Record<string, string> = {
    "zh-CN": "简体中文",
    en: "英语",
    "en-US": "英语",
    "en-GB": "英语",
    ja: "日语",
    fr: "法语",
    de: "德语",
    es: "西班牙语",
    ko: "韩语",
    ar: "阿拉伯语",
    it: "意大利语",
    pt: "葡萄牙语",
    nl: "荷兰语",
    ru: "俄语",
  };
  if (byLocale[locale]) return byLocale[locale];
  if (label) {
    const name = label.split("(")[0]?.trim();
    if (name) return name;
  }
  return locale;
}

export function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}
