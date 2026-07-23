import { blobRead, blobWrite } from "../blobV4.js";
import { shopScanAiConfigured, shopScanChatJson, SHOP_SCAN_AI_MODEL } from "./ai.js";
import { sampleTranslationPairs, type TranslationPair } from "./translationSamples.js";
import type { ShopLocaleRow } from "./shopContext.js";

/**
 * 阶段4：从已发布语言的既有译文采样「源文→译文」对，AI 归纳应固定翻译的术语。
 *
 * 仅写入扫描 Blob（glossary-raw.json），供 shop-profile 页面展示；
 * 不写入 Glossary 数据库，避免污染正式术语表。
 */

const GLOSSARY_SAMPLE_MODULES = ["PRODUCT", "COLLECTION"];
const MAX_PAIRS_PER_LOCALE = Math.max(
  10,
  Number(process.env.SHOP_SCAN_GLOSSARY_SAMPLE) || 40,
);
const MAX_TERMS_PER_LOCALE = Math.max(
  5,
  Number(process.env.SHOP_SCAN_GLOSSARY_MAX_TERMS) || 30,
);

export type GlossaryStageResult = {
  status: "done" | "skipped";
  reason?: string;
  glossaryCount: number;
  glossarySuggestions: Array<{ locale: string; source: string; target: string }>;
};

type AiGlossaryResponse = { terms?: Array<{ source?: string; target?: string }> };

type GlossaryTermRow = { source: string; target: string };
type GlossarySamplesBlob = {
  perLocale?: Array<{
    locale?: string;
    samples?: TranslationPair[];
  }>;
};

export async function runGlossaryStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
  enableAi: boolean;
}): Promise<GlossaryStageResult> {
  const { shop, accessToken, primaryLocale, locales, blobPrefix, heartbeat, enableAi } = args;

  const publishedTargets = locales.filter(
    (l) =>
      l.published &&
      !l.primary &&
      l.locale.trim() &&
      l.locale.trim().toLowerCase() !== primaryLocale.trim().toLowerCase(),
  );

  if (publishedTargets.length === 0) {
    return { status: "skipped", reason: "no_published_targets", glossaryCount: 0, glossarySuggestions: [] };
  }
  if (!enableAi) {
    return { status: "skipped", reason: "ai_manual_only", glossaryCount: 0, glossarySuggestions: [] };
  }
  if (!shopScanAiConfigured()) {
    return { status: "skipped", reason: "ai_not_configured", glossaryCount: 0, glossarySuggestions: [] };
  }

  const rawLog: Array<{
    locale: string;
    samples: TranslationPair[];
    aiRaw: string;
    terms: GlossaryTermRow[];
  }> = [];
  let totalSuggested = 0;
  const glossarySuggestions: Array<{ locale: string; source: string; target: string }> = [];

  for (const target of publishedTargets) {
    const samples = await sampleTranslationPairs(
      shop,
      accessToken,
      target.locale,
      GLOSSARY_SAMPLE_MODULES,
      MAX_PAIRS_PER_LOCALE,
    );
    await heartbeat();

    if (samples.length < 3) {
      rawLog.push({ locale: target.locale, samples, aiRaw: "", terms: [] });
      continue;
    }

    const messages = [
      {
        role: "system" as const,
        content:
          "你是多语言电商术语专家。根据给定的『源文 => 译文』样本（目标语言 " +
          target.locale +
          "），归纳出应当在整店保持一致翻译的术语（品牌名、专有名词、产品特定叫法等）。" +
          '严格输出 JSON：{"terms": [{"source": string, "target": string}]}。' +
          "只保留高置信、确应固定的术语，最多 " +
          MAX_TERMS_PER_LOCALE +
          " 条；通用词、整句、明显机翻不一致的不要收录。",
      },
      {
        role: "user" as const,
        content: samples.map((p) => `${p.source} => ${p.target}`).join("\n"),
      },
    ];

    const { parsed, raw } = await shopScanChatJson<AiGlossaryResponse>(messages);
    await heartbeat();

    const terms = (Array.isArray(parsed?.terms) ? parsed!.terms : [])
      .map((t) => ({
        source: String(t?.source ?? "").trim(),
        target: String(t?.target ?? "").trim(),
      }))
      .filter((e) => e.source && e.target)
      .slice(0, MAX_TERMS_PER_LOCALE);

    totalSuggested += terms.length;
    for (const term of terms) {
      glossarySuggestions.push({
        locale: target.locale,
        source: term.source,
        target: term.target,
      });
    }
    rawLog.push({ locale: target.locale, samples, aiRaw: raw, terms });
    await heartbeat();
  }

  await blobWrite(`${blobPrefix}/glossary-raw.json`, {
    stage: "glossary",
    shop,
    model: SHOP_SCAN_AI_MODEL,
    totalSuggested,
    perLocale: rawLog,
    scannedAt: new Date().toISOString(),
  });

  if (totalSuggested === 0) {
    return { status: "skipped", reason: "no_terms", glossaryCount: 0, glossarySuggestions: [] };
  }
  return { status: "done", glossaryCount: totalSuggested, glossarySuggestions };
}

export async function runGlossarySamplesStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<GlossaryStageResult> {
  const { shop, accessToken, primaryLocale, locales, blobPrefix, heartbeat } = args;
  const publishedTargets = locales.filter(
    (l) =>
      l.published &&
      !l.primary &&
      l.locale.trim() &&
      l.locale.trim().toLowerCase() !== primaryLocale.trim().toLowerCase(),
  );

  if (publishedTargets.length === 0) {
    return { status: "skipped", reason: "no_published_targets", glossaryCount: 0, glossarySuggestions: [] };
  }

  const perLocale: Array<{ locale: string; samples: TranslationPair[] }> = [];
  for (const target of publishedTargets) {
    const samples = await sampleTranslationPairs(
      shop,
      accessToken,
      target.locale,
      GLOSSARY_SAMPLE_MODULES,
      MAX_PAIRS_PER_LOCALE,
    );
    perLocale.push({ locale: target.locale, samples });
    await heartbeat();
  }

  await blobWrite(`${blobPrefix}/glossary-samples.json`, {
    stage: "glossarySamples",
    shop,
    perLocale,
    sampledAt: new Date().toISOString(),
  });

  return { status: "done", glossaryCount: 0, glossarySuggestions: [] };
}

export async function runGlossaryAiStageFromBlob(args: {
  blobPrefix: string;
  sourceBlobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<GlossaryStageResult> {
  const { blobPrefix, sourceBlobPrefix, heartbeat } = args;
  if (!shopScanAiConfigured()) {
    return { status: "skipped", reason: "ai_not_configured", glossaryCount: 0, glossarySuggestions: [] };
  }

  const prefix = sourceBlobPrefix.endsWith("/") ? sourceBlobPrefix : `${sourceBlobPrefix}/`;
  const rawBlob = await blobRead<GlossarySamplesBlob>(`${prefix}glossary-samples.json`);
  await heartbeat();
  const perLocale = Array.isArray(rawBlob?.perLocale) ? rawBlob.perLocale : [];
  if (perLocale.length === 0) {
    return { status: "skipped", reason: "missing_glossary_samples", glossaryCount: 0, glossarySuggestions: [] };
  }

  const rawLog: Array<{
    locale: string;
    samples: TranslationPair[];
    aiRaw: string;
    terms: GlossaryTermRow[];
  }> = [];
  let totalSuggested = 0;
  const glossarySuggestions: Array<{ locale: string; source: string; target: string }> = [];

  for (const localeRow of perLocale) {
    const locale = String(localeRow?.locale ?? "").trim();
    const samples = Array.isArray(localeRow?.samples) ? localeRow.samples : [];
    if (!locale) continue;
    if (samples.length < 3) {
      rawLog.push({ locale, samples, aiRaw: "", terms: [] });
      continue;
    }

    const messages = [
      {
        role: "system" as const,
        content:
          "你是多语言电商术语专家。根据给定的『源文 => 译文』样本（目标语言 " +
          locale +
          "），归纳出应当在整店保持一致翻译的术语（品牌名、专有名词、产品特定叫法等）。" +
          '严格输出 JSON：{"terms": [{"source": string, "target": string}]}。' +
          "只保留高置信、确应固定的术语，最多 " +
          MAX_TERMS_PER_LOCALE +
          " 条；通用词、整句、明显机翻不一致的不要收录。",
      },
      {
        role: "user" as const,
        content: samples.map((p) => `${p.source} => ${p.target}`).join("\n"),
      },
    ];

    const { parsed, raw } = await shopScanChatJson<AiGlossaryResponse>(messages);
    await heartbeat();

    const terms = (Array.isArray(parsed?.terms) ? parsed!.terms : [])
      .map((t) => ({
        source: String(t?.source ?? "").trim(),
        target: String(t?.target ?? "").trim(),
      }))
      .filter((e) => e.source && e.target)
      .slice(0, MAX_TERMS_PER_LOCALE);

    totalSuggested += terms.length;
    for (const term of terms) {
      glossarySuggestions.push({ locale, source: term.source, target: term.target });
    }
    rawLog.push({ locale, samples, aiRaw: raw, terms });
  }

  await blobWrite(`${blobPrefix}/glossary-raw.json`, {
    stage: "glossary",
    model: SHOP_SCAN_AI_MODEL,
    sourceBlobPrefix,
    totalSuggested,
    perLocale: rawLog,
    scannedAt: new Date().toISOString(),
  });

  if (totalSuggested === 0) {
    return { status: "skipped", reason: "no_terms", glossaryCount: 0, glossarySuggestions: [] };
  }
  return { status: "done", glossaryCount: totalSuggested, glossarySuggestions };
}
