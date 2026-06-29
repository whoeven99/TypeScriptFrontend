/**
 * 语言简写唯一来源：新建任务 targets、任务列表、语言覆盖率须都用 localeRegionCode。
 * Shopify locale（如 ko）→ 设计稿缩写（如 KR）。
 */
export function localeRegionCode(locale: string): string {
  const map: Record<string, string> = {
    "zh-CN": "CN",
    "zh-TW": "TW",
    en: "EN",
    "en-US": "EN",
    "en-GB": "EN",
    ja: "JP",
    fr: "FR",
    de: "DE",
    es: "ES",
    ko: "KR",
    ar: "SA",
    it: "IT",
    pt: "PT",
    "pt-BR": "PT",
    "pt-PT": "PT",
    nl: "NL",
    ru: "RU",
    sv: "SE",
    tr: "TR",
    uk: "UA",
    id: "ID",
    pl: "PL",
    th: "TH",
    vi: "VI",
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
    id: "印尼语",
    pl: "波兰语",
    th: "泰语",
    vi: "越南语",
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

export function formatLocaleRoute(source: string, target: string): string {
  return `${localeRegionCode(source)} → ${localeRegionCode(target)}`;
}

export function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}
