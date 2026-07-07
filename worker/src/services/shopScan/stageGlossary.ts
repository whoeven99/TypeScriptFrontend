import { blobWrite } from "../blobV4.js";
import { shopScanAiConfigured, shopScanChatJson, SHOP_SCAN_AI_MODEL } from "./ai.js";
import { sampleTranslationPairs, type TranslationPair } from "./translationSamples.js";
import { insertAiGlossaryEntries, type AiGlossaryEntry } from "./tsfWrite.js";
import type { ShopLocaleRow } from "./shopContext.js";

/**
 * 阶段4：从已发布语言的既有译文采样「源文→译文」对，AI 归纳应固定翻译的术语，
 * 批量写入 Glossary（status=0 待确认，createdBy='ai-shop-scan'，rangeCode=对应语言）。
 * 无已发布语言或无译文样本则跳过。
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
};

type AiGlossaryResponse = { terms?: Array<{ source?: string; target?: string }> };

export async function runGlossaryStage(args: {
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
    return { status: "skipped", reason: "no_published_targets", glossaryCount: 0 };
  }
  if (!shopScanAiConfigured()) {
    return { status: "skipped", reason: "ai_not_configured", glossaryCount: 0 };
  }

  const rawLog: Array<{
    locale: string;
    samples: TranslationPair[];
    aiRaw: string;
    inserted: number;
  }> = [];
  let totalInserted = 0;

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
      rawLog.push({ locale: target.locale, samples, aiRaw: "", inserted: 0 });
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

    const terms = Array.isArray(parsed?.terms) ? parsed!.terms : [];
    const entries: AiGlossaryEntry[] = terms
      .map((t) => ({
        sourceText: String(t?.source ?? "").trim(),
        targetText: String(t?.target ?? "").trim(),
        rangeCode: target.locale,
      }))
      .filter((e) => e.sourceText && e.targetText)
      .slice(0, MAX_TERMS_PER_LOCALE);

    const inserted = await insertAiGlossaryEntries(shop, entries);
    totalInserted += inserted;
    rawLog.push({ locale: target.locale, samples, aiRaw: raw, inserted });
    await heartbeat();
  }

  await blobWrite(`${blobPrefix}/glossary-raw.json`, {
    stage: "glossary",
    shop,
    model: SHOP_SCAN_AI_MODEL,
    totalInserted,
    perLocale: rawLog,
    scannedAt: new Date().toISOString(),
  });

  if (totalInserted === 0) {
    return { status: "skipped", reason: "no_terms", glossaryCount: 0 };
  }
  return { status: "done", glossaryCount: totalInserted };
}
