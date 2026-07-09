import { readV4Blob } from "~/server/translateV4/blob.server";

/** 第二步 AI 归纳：术语与模块策略（与 worker profileInduction 对齐）。 */
export type TerminologyStrategyView = {
  brandTerms: string[];
  doNotTranslateTerms: string[];
  preferredTerms: Array<{ source: string; note: string | null }>;
  seoTerms: string[];
  moduleHints: Array<{
    module: string;
    tonePolicy: string | null;
    keywordPolicy: string | null;
    literalVsAdaptive: string | null;
  }>;
};

/** 从译文样本归纳的术语建议（仅展示，不写 Glossary 表）。 */
export type GlossarySuggestionView = {
  locale: string;
  source: string;
  target: string;
};

export type ShopScanArtifacts = {
  strategy: TerminologyStrategyView | null;
  glossarySuggestions: GlossarySuggestionView[];
};

type ProfileFactsBlob = {
  induction?: {
    strategy?: TerminologyStrategyView | null;
  } | null;
};

type GlossaryRawBlob = {
  perLocale?: Array<{
    locale?: string;
    terms?: Array<{ source?: string; target?: string }>;
    // 兼容旧结构：从 ai 解析结果反推（无 terms 字段时）
    inserted?: number;
  }>;
};

/** 从扫描 Blob 读取画像第二步策略与术语建议（shop-profile 页面专用）。 */
export async function loadShopScanArtifacts(
  blobPrefix: string | null | undefined,
): Promise<ShopScanArtifacts> {
  if (!blobPrefix) {
    return { strategy: null, glossarySuggestions: [] };
  }

  const prefix = blobPrefix.endsWith("/") ? blobPrefix : `${blobPrefix}/`;

  const [profileFacts, glossaryRaw] = await Promise.all([
    readV4Blob<ProfileFactsBlob>(`${prefix}profile-facts.json`),
    readV4Blob<GlossaryRawBlob>(`${prefix}glossary-raw.json`),
  ]);

  const strategy = normalizeStrategy(profileFacts?.induction?.strategy);
  const glossarySuggestions = normalizeGlossarySuggestions(glossaryRaw);

  return { strategy, glossarySuggestions };
}

function normalizeStrategy(raw: TerminologyStrategyView | null | undefined): TerminologyStrategyView | null {
  if (!raw) return null;

  const brandTerms = stringList(raw.brandTerms, 20);
  const doNotTranslateTerms = stringList(raw.doNotTranslateTerms, 20);
  const seoTerms = stringList(raw.seoTerms, 15);
  const preferredTerms = (raw.preferredTerms ?? [])
    .map((t) => ({
      source: (t?.source ?? "").trim(),
      note: t?.note?.trim() || null,
    }))
    .filter((t) => t.source)
    .slice(0, 20);
  const moduleHints = (raw.moduleHints ?? [])
    .map((h) => ({
      module: (h?.module ?? "").trim(),
      tonePolicy: h?.tonePolicy?.trim() || null,
      keywordPolicy: h?.keywordPolicy?.trim() || null,
      literalVsAdaptive: h?.literalVsAdaptive?.trim() || null,
    }))
    .filter((h) => h.module)
    .slice(0, 10);

  if (
    brandTerms.length === 0 &&
    doNotTranslateTerms.length === 0 &&
    preferredTerms.length === 0 &&
    seoTerms.length === 0 &&
    moduleHints.length === 0
  ) {
    return null;
  }

  return { brandTerms, doNotTranslateTerms, preferredTerms, seoTerms, moduleHints };
}

function normalizeGlossarySuggestions(raw: GlossaryRawBlob | null): GlossarySuggestionView[] {
  const out: GlossarySuggestionView[] = [];
  const seen = new Set<string>();

  for (const row of raw?.perLocale ?? []) {
    const locale = (row.locale ?? "").trim();
    if (!locale) continue;
    for (const term of row.terms ?? []) {
      const source = (term.source ?? "").trim();
      const target = (term.target ?? "").trim();
      if (!source || !target) continue;
      const key = `${locale}\u0000${source}\u0000${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ locale, source, target });
    }
  }

  return out;
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}
