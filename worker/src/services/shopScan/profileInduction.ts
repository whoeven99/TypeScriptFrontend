import { shopScanChatJson, SHOP_SCAN_AI_MODEL, type ChatMessage } from "./ai.js";
import type { ShopMarket, ShopProfileFacts } from "./shopContext.js";
import type { ShopSignalBundle } from "./signalExtraction.js";
import { buildCategoryTerminologyPreload } from "./categoryTerminologyPreload.js";

/**
 * AI 归纳两步链路（文档 Phase 4 / 9 节）。
 *
 * 第一步：店铺理解 —— 行业、定位、卖点、风格、市场关注点。
 * 第二步：术语与策略 —— 基于第一步结论，输出术语建议与模块级翻译方向。
 *
 * 理解与决策分离，提升稳定性与可解释性；第二步失败不阻断画像落库。
 */

/** 第一步产出：店铺理解。 */
export type ShopUnderstanding = {
  industry: string;
  subIndustry: string | null;
  brandPositioning: string | null;
  coreProductTypes: string[];
  sellingPoints: string[];
  priceRange: string | null;
  voiceStyle: string | null;
  seoDirection: string | null;
  marketNotes: string[];
  /** 1-3 句店铺描述（写入 ShopProfile.description）。 */
  description: string;
  /** 5-15 个关键词（写入 ShopProfile.keywords）。 */
  keywords: string[];
};

/** 第二步产出：术语与翻译策略建议（暂存 Blob，供后续 Glossary / Module Policy 消费）。 */
export type TerminologyStrategy = {
  brandTerms: string[];
  doNotTranslateTerms: string[];
  preferredTerms: Array<{ source: string; note: string | null }>;
  regionalStyleGuidance: string[];
  moduleHints: Array<{
    module: string;
    tonePolicy: string | null;
    literalVsAdaptive: string | null;
  }>;
};

export type ProfileInductionResult = {
  understanding: ShopUnderstanding | null;
  strategy: TerminologyStrategy | null;
  ai: {
    model: string;
    step1: { raw: string; tokens: number };
    step2: { raw: string; tokens: number } | null;
  };
};

type AiUnderstandingResponse = {
  industry?: string;
  subIndustry?: string;
  brandPositioning?: string;
  coreProductTypes?: string[];
  sellingPoints?: string[];
  priceRange?: string;
  voiceStyle?: string;
  seoDirection?: string;
  marketNotes?: string[];
  description?: string;
  keywords?: string[];
};

type AiStrategyResponse = {
  brandTerms?: string[];
  doNotTranslateTerms?: string[];
  preferredTerms?: Array<{ source?: string; note?: string }>;
  regionalStyleGuidance?: string[];
  moduleHints?: Array<{
    module?: string;
    tonePolicy?: string;
    literalVsAdaptive?: string;
  }>;
};

export function buildMaterialPrompt(
  facts: ShopProfileFacts,
  markets: ShopMarket[],
  signals: ShopSignalBundle,
): string {
  const marketBlock = markets.length
    ? markets
        .map((m) => {
          const currency = m.baseCurrency ? `, ${m.baseCurrency}` : "";
          const locales = m.locales.length ? m.locales.join(", ") : "未知";
          return `- ${m.name}${currency}: ${locales}`;
        })
        .join("\n")
    : "";

  return [
    `店铺名称：${facts.shopName}`,
    facts.primaryDomain ? `域名：${facts.primaryDomain}` : "",
    facts.currencyCode ? `货币：${facts.currencyCode}` : "",
    marketBlock ? `市场配置：\n${marketBlock}` : "",
    signals.brandTerms.length ? `品牌/供应商：${signals.brandTerms.join(", ")}` : "",
    signals.categoryTerms.length ? `品类词：${signals.categoryTerms.join(", ")}` : "",
    signals.menuTerms.length ? `导航词：${signals.menuTerms.join(", ")}` : "",
    signals.weightedTopTerms.length
      ? `高权重关键词：${signals.weightedTopTerms.map((t) => t.term).join(", ")}`
      : "",
    signals.weightedTopPhrases.length
      ? `高权重短语：${signals.weightedTopPhrases.map((t) => t.term).join(", ")}`
      : "",
    signals.representativeSamples.length
      ? `代表文案样本：\n${signals.representativeSamples
          .map((s) => `- [${s.source}] ${s.text}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runProfileInduction(args: {
  facts: ShopProfileFacts;
  markets: ShopMarket[];
  signals: ShopSignalBundle;
  primaryLocale: string;
}): Promise<ProfileInductionResult> {
  const { facts, markets, signals, primaryLocale } = args;
  const material = buildMaterialPrompt(facts, markets, signals);

  const step1Messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是电商店铺分析专家。根据给定的店铺信号与市场配置，归纳「这是什么店」——只做理解，不做术语决策。" +
        '严格输出 JSON：{"industry":string,"subIndustry":string,"brandPositioning":string,"coreProductTypes":string[],"sellingPoints":string[],"priceRange":string,"voiceStyle":string,"seoDirection":string,"marketNotes":string[],"description":string,"keywords":string[]}。' +
        "industry 为行业/品类；subIndustry 为更细分的子品类（无则空字符串）；brandPositioning 为品牌定位一句话；" +
        "coreProductTypes 为核心商品类型 3-8 个；sellingPoints 为卖点 3-6 条；priceRange 为价格区间判断（如 中高端、平价，无则空字符串）；" +
        "voiceStyle 为品牌语气（如 专业、活泼、高端）；seoDirection 为内容/SEO 导向一句话；marketNotes 为各市场本地化关注点 0-5 条；" +
        `description 为 1-3 句店铺描述；keywords 为 5-15 个最能代表店铺的关键词。description/industry/卖点等用店铺主要语言（${primaryLocale}）书写。`,
    },
    { role: "user", content: material },
  ];

  const step1 = await shopScanChatJson<AiUnderstandingResponse>(step1Messages);
  const understanding = normalizeUnderstanding(step1.parsed);

  if (!understanding) {
    return {
      understanding: null,
      strategy: null,
      ai: {
        model: SHOP_SCAN_AI_MODEL,
        step1: { raw: step1.raw, tokens: step1.tokens },
        step2: null,
      },
    };
  }

  const preloadedTerminology = buildCategoryTerminologyPreload({
    facts,
    signals,
    understanding,
  });

  const step2Messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是多语言电商术语与翻译策略专家。基于已完成的店铺理解结论与原始信号，输出术语控制建议与模块级翻译方向。" +
        '严格输出 JSON：{"brandTerms":string[],"doNotTranslateTerms":string[],"preferredTerms":[{"source":string,"note":string}],"regionalStyleGuidance":string[],"moduleHints":[{"module":string,"tonePolicy":string,"literalVsAdaptive":string}]}。' +
        "preferredTerms 主要用于该行业/类目里的专业词汇、工艺词、产品家族词、材质词等“容易直译出错”的源词，重点给出在目标市场更专业、更地道的译法方向；不要把品牌名、店铺名、供应商名混进 preferredTerms。" +
        "brandTerms 与 doNotTranslateTerms 主要用于网站自身信息，例如品牌名、系列名、供应商名、产品线名、型号名、站点专有词；brandTerms 为应保留或固定表达的品牌/系列词，doNotTranslateTerms 为不应翻译的词（品牌名、型号等）。" +
        "regionalStyleGuidance 为 3-6 条主翻译阶段使用的地区化行业表达要求，强调当地行业常用说法、避免英语直译、保持品牌词稳定，不考虑 SEO 目标；" +
        "moduleHints 覆盖 PRODUCT_TITLE、COLLECTION_TITLE、MENU_ITEM、THEME_JSON_TEXT、ARTICLE_TITLE、META_DESCRIPTION 中有依据的模块，每项 tonePolicy/literalVsAdaptive 各一句话（无则空字符串）。只输出高置信、有信号支撑的内容，不要臆造。",
    },
    {
      role: "user",
      content: [
        "【店铺理解结论】",
        JSON.stringify(understanding, null, 2),
        "",
        "【原始信号摘要】",
        `品牌词：${signals.brandTerms.join(", ") || "无"}`,
        `品类词：${signals.categoryTerms.join(", ") || "无"}`,
        `导航词：${signals.menuTerms.join(", ") || "无"}`,
        `高权重词：${signals.weightedTopTerms.map((t) => t.term).join(", ") || "无"}`,
        preloadedTerminology?.preferredTerms?.length
          ? `专业词候选（来自商品/集合/品类）：${preloadedTerminology.preferredTerms
              .map((term) => term.source)
              .join(", ")}`
          : "专业词候选（来自商品/集合/品类）：无",
        preloadedTerminology?.brandTerms?.length
          ? `站点品牌/专有词候选：${preloadedTerminology.brandTerms.join(", ")}`
          : "站点品牌/专有词候选：无",
        preloadedTerminology?.doNotTranslateTerms?.length
          ? `站点禁翻词候选：${preloadedTerminology.doNotTranslateTerms.join(", ")}`
          : "站点禁翻词候选：无",
        markets.length
          ? `市场：${markets.map((m) => `${m.name}(${m.locales.join("/")})`).join("; ")}`
          : "",
      ].join("\n"),
    },
  ];

  const step2 = await shopScanChatJson<AiStrategyResponse>(step2Messages);
  const strategy = normalizeStrategy(step2.parsed);

  return {
    understanding,
    strategy,
    ai: {
      model: SHOP_SCAN_AI_MODEL,
      step1: { raw: step1.raw, tokens: step1.tokens },
      step2: { raw: step2.raw, tokens: step2.tokens },
    },
  };
}

function normalizeUnderstanding(raw: AiUnderstandingResponse | null): ShopUnderstanding | null {
  if (!raw) return null;
  const industry = raw.industry?.trim();
  if (!industry) return null;

  return {
    industry,
    subIndustry: raw.subIndustry?.trim() || null,
    brandPositioning: raw.brandPositioning?.trim() || null,
    coreProductTypes: stringArray(raw.coreProductTypes, 8),
    sellingPoints: stringArray(raw.sellingPoints, 6),
    priceRange: raw.priceRange?.trim() || null,
    voiceStyle: raw.voiceStyle?.trim() || null,
    seoDirection: raw.seoDirection?.trim() || null,
    marketNotes: stringArray(raw.marketNotes, 5),
    description: raw.description?.trim() || "",
    keywords: stringArray(raw.keywords, 15),
  };
}

function normalizeStrategy(raw: AiStrategyResponse | null): TerminologyStrategy | null {
  if (!raw) return null;

  const brandTerms = stringArray(raw.brandTerms, 20);
  const doNotTranslateTerms = stringArray(raw.doNotTranslateTerms, 20);
  const regionalStyleGuidance = stringArray(raw.regionalStyleGuidance, 8);
  const preferredTerms = (raw.preferredTerms ?? [])
    .map((t) => ({
      source: String(t?.source ?? "").trim(),
      note: t?.note?.trim() || null,
    }))
    .filter((t) => t.source)
    .slice(0, 20);

  const moduleHints = (raw.moduleHints ?? [])
    .map((h) => ({
      module: String(h?.module ?? "").trim(),
      tonePolicy: h?.tonePolicy?.trim() || null,
      literalVsAdaptive: h?.literalVsAdaptive?.trim() || null,
    }))
    .filter((h) => h.module)
    .slice(0, 10);

  if (
    brandTerms.length === 0 &&
    doNotTranslateTerms.length === 0 &&
    preferredTerms.length === 0 &&
    regionalStyleGuidance.length === 0 &&
    moduleHints.length === 0
  ) {
    return null;
  }

  return { brandTerms, doNotTranslateTerms, preferredTerms, regionalStyleGuidance, moduleHints };
}

function stringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}
