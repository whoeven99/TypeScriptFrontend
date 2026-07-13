import {
  finalizeTranslationSceneResolution,
  resolveTranslationScene,
  type FieldContentClass,
  type JsonMode,
  type TranslationAudience,
  type TranslationFieldKind,
  type TranslationPromptProfileId,
  type TranslationRewriteFreedom,
  type TranslationRole,
  type TranslationScene,
} from "./translationSceneResolver.js";
import {
  getTranslationFieldRule,
  getTranslationFieldConstraintHints,
  type TranslationFieldRule,
  type TranslationConstraintOrigin,
} from "./translationFieldLimits.js";

export type ShopPromptContext = {
  industry?: string | null;
  subIndustry?: string | null;
  brandTone?: string | null;
  brandPositioning?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  sellingPoints?: string[] | null;
  priceRange?: string | null;
};

export type ModulePolicyContext = {
  module?: string | null;
  tonePolicy?: string | null;
  keywordPolicy?: string | null;
  literalVsAdaptive?: string | null;
};

export type TerminologyPromptContext = {
  brandTerms?: string[] | null;
  doNotTranslateTerms?: string[] | null;
  preferredTerms?: Array<{ source: string; note?: string | null }> | null;
  seoTerms?: string[] | null;
};

export type MarketPromptContext = {
  publishedLocales?: string[] | null;
  marketNotes?: string[] | null;
  currencyContext?: string[] | null;
};

export type ThemeSceneHintContext = {
  module: string;
  keyPattern: string;
  namespace?: string | null;
  resourcePattern?: string | null;
  scene: string;
  role?: string | null;
  confidence?: number | null;
  tonePreference?: string | null;
  creativity?: string | null;
};

export type ThemeSceneProfileContext = {
  sceneHints?: ThemeSceneHintContext[] | null;
};

export type TranslationPromptContextInput = {
  module?: string | null;
  resourceId?: string | null;
  shopContext?: ShopPromptContext | null;
  terminology?: TerminologyPromptContext | null;
  market?: MarketPromptContext | null;
  modulePolicy?: ModulePolicyContext | null;
  themeSceneProfile?: ThemeSceneProfileContext | null;
};

export type ResolvedTranslationPromptContext = {
  promptProfileId: TranslationPromptProfileId;
  scene: TranslationScene;
  role: TranslationRole | null;
  module: string | null;
  contentClass: Exclude<FieldContentClass, "skip">;
  jsonMode: JsonMode | null;
  fieldKind: TranslationFieldKind;
  audience: TranslationAudience;
  rewriteFreedom: TranslationRewriteFreedom;
  shopContext: ShopPromptContext | null;
  terminology: TerminologyPromptContext | null;
  market: MarketPromptContext | null;
  modulePolicy: ModulePolicyContext | null;
  constraints: TranslationConstraintSet;
};

export type PromptContextBlockSelection = {
  shopContext: boolean;
  terminology: boolean;
  market: boolean;
  modulePolicy: boolean;
  scenePolicy: true;
};

export type TranslationConstraintSet = {
  preserveHtmlStructure: boolean;
  preserveJsonStructure: boolean;
  preserveSentinels: boolean;
  preservePlaceholders: boolean;
  noHtmlTagsInLeaf: boolean;
  keepLeadingTrailingWhitespace: boolean;
  maxChars?: number;
  recommendedMaxChars?: number;
  mustBeSlugLike?: boolean;
  shortUiLabelPreferred?: boolean;
  fieldHints: Array<{
    code: string;
    origin: TranslationConstraintOrigin;
    promptText: string;
    maxChars?: number;
  }>;
};

export type TranslationPromptPlan = {
  task: {
    scene: TranslationScene;
    role: TranslationRole | null;
    fieldKind: TranslationFieldKind;
    fieldRule: TranslationFieldRule;
    audience: TranslationAudience;
    rewriteFreedom: TranslationRewriteFreedom;
    contentClass: Exclude<FieldContentClass, "skip">;
    module: string | null;
    jsonMode: JsonMode | null;
  };
  constraints: TranslationConstraintSet;
  selection: PromptContextBlockSelection;
  debugReasons: string[];
};

const MAX_TERMS = 12;
const MAX_PREFERRED_TERMS = 10;
const MAX_MARKET_NOTES = 6;

export function buildResolvedPromptContext(args: {
  module?: string | null;
  resourceId?: string | null;
  key: string;
  contentClass: Exclude<FieldContentClass, "skip">;
  shopifyType?: string | null;
  base?: TranslationPromptContextInput | null;
}): ResolvedTranslationPromptContext {
  const baseResolution = resolveTranslationScene({
    module: args.module ?? args.base?.module,
    key: args.key,
    contentClass: args.contentClass,
    shopifyType: args.shopifyType,
  });
  const sceneHint = findBestThemeSceneHint(
    args.base?.themeSceneProfile?.sceneHints,
    baseResolution.module,
    args.key,
    args.resourceId ?? args.base?.resourceId ?? null,
  );
  const resolution: ReturnType<typeof resolveTranslationScene> =
    sceneHint && (sceneHint.confidence ?? 0) >= 0.78
      ? finalizeTranslationSceneResolution({
          ...baseResolution,
          ...applyThemeSceneHint(baseResolution, sceneHint),
        })
      : baseResolution;

  const modulePolicy = normalizeModulePolicy(
    args.base?.modulePolicy,
    baseResolution.module ?? args.base?.module ?? null,
  );

  return {
    ...resolution,
    module: baseResolution.module ?? args.base?.module ?? null,
    shopContext: normalizeShopContext(args.base?.shopContext),
    terminology: normalizeTerminology(args.base?.terminology),
    market: normalizeMarket(args.base?.market),
    modulePolicy,
    constraints: resolvePromptConstraints(resolution),
  };
}

export function buildPromptContextBlock(
  context: ResolvedTranslationPromptContext,
  options?: {
    sourceText?: string | null;
    targetLocale?: string | null;
  },
): string | null {
  const plan = buildPromptPlan(context, options);
  const blocks = [
    buildTaskPolicyBlock(plan),
    buildConstraintBlock(plan),
    plan.selection.shopContext ? buildShopContextBlock(context.shopContext) : null,
    plan.selection.terminology
      ? buildTerminologyBlock(context.terminology, options?.sourceText)
      : null,
    plan.selection.market ? buildMarketContextBlock(context.market) : null,
    plan.selection.modulePolicy ? buildModulePolicyBlock(context.modulePolicy) : null,
  ].filter(Boolean);

  return blocks.length > 0 ? blocks.join("\n\n") : null;
}

export function buildPromptPlan(
  context: ResolvedTranslationPromptContext,
  options?: {
    sourceText?: string | null;
    targetLocale?: string | null;
  },
): TranslationPromptPlan {
  const selection = selectPromptContextBlocks(context, options);
  const debugReasons: string[] = [];
  if (selection.terminology) debugReasons.push("terminology_hit");
  if (selection.shopContext) debugReasons.push("style_context");
  if (selection.market) debugReasons.push("regional_market_context");
  if (selection.modulePolicy) debugReasons.push("module_exception");
  if (context.constraints.maxChars != null) debugReasons.push(`max_chars:${context.constraints.maxChars}`);
  if (context.constraints.recommendedMaxChars != null) {
    debugReasons.push(`recommended_max_chars:${context.constraints.recommendedMaxChars}`);
  }
  if (context.constraints.mustBeSlugLike) debugReasons.push("slug_constraint");
  if (context.constraints.shortUiLabelPreferred) debugReasons.push("short_ui_label");
  for (const hint of context.constraints.fieldHints) {
    debugReasons.push(`constraint:${hint.code}:${hint.origin}`);
  }
  if (context.constraints.preserveHtmlStructure) debugReasons.push("preserve_html");
  if (context.constraints.preserveJsonStructure) debugReasons.push("preserve_json");

  return {
    task: {
      scene: context.scene,
      role: context.role,
      fieldKind: context.fieldKind,
      fieldRule: getTranslationFieldRule(context.fieldKind),
      audience: context.audience,
      rewriteFreedom: context.rewriteFreedom,
      contentClass: context.contentClass,
      module: context.module,
      jsonMode: context.jsonMode,
    },
    constraints: context.constraints,
    selection,
    debugReasons,
  };
}

export function selectPromptContextBlocks(
  context: ResolvedTranslationPromptContext,
  options?: {
    sourceText?: string | null;
    targetLocale?: string | null;
  },
): PromptContextBlockSelection {
  const sourceText = trim(options?.sourceText) ?? "";
  const isShortUiCopy = sourceText.length > 0 ? looksLikeShortUiCopy(sourceText, context.role) : false;
  const terminologyTriggered = shouldInjectTerminology(context.terminology, sourceText);
  const styleScore = computeStyleContextScore(context, sourceText, isShortUiCopy);
  const marketScore = computeMarketContextScore(context, sourceText, options?.targetLocale);

  const shopContext = Boolean(context.shopContext) && styleScore >= 2;
  const terminology = Boolean(context.terminology) && terminologyTriggered && context.scene !== "config_like";
  const market = Boolean(context.market) && marketScore >= 2;
  const modulePolicy =
    Boolean(context.modulePolicy) &&
    shouldInjectModulePolicy(context, isShortUiCopy, sourceText);

  return {
    shopContext,
    terminology,
    market,
    modulePolicy,
    scenePolicy: true,
  };
}

function buildShopContextBlock(profile: ShopPromptContext | null): string | null {
  if (!profile) return null;

  const industry = trim(profile.industry);
  const subIndustry = trim(profile.subIndustry);
  const brandTone = trim(profile.brandTone);
  const brandPositioning = trim(profile.brandPositioning);

  const lines: string[] = [];
  if (industry) lines.push(`- Industry / category: ${industry}`);
  if (subIndustry) lines.push(`- Sub-category: ${subIndustry}`);
  if (brandTone) lines.push(`- Brand voice / tone: ${brandTone}`);
  if (brandPositioning) lines.push(`- Brand positioning: ${brandPositioning}`);

  if (lines.length === 0) return null;

  return [
    "Style context (use only when it helps tone and wording; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildTaskPolicyBlock(plan: TranslationPromptPlan): string {
  const lines = [
    `- Scene: ${plan.task.scene}`,
    `- Audience: ${describeAudience(plan.task.audience)}`,
    `- Adaptation level: ${describeRewriteFreedom(plan.task.rewriteFreedom)}`,
    `- Field kind: ${plan.task.fieldRule.displayName}`,
  ];
  if (plan.task.role) lines.push(`- Role: ${plan.task.role}`);
  if (plan.task.module) lines.push(`- Module: ${plan.task.module}`);
  lines.push(`- Content class: ${plan.task.contentClass}`);
  if (plan.task.jsonMode) lines.push(`- JSON mode: ${plan.task.jsonMode}`);
  if (plan.task.fieldRule.promptAudienceHint) {
    lines.push(`- Field usage: ${plan.task.fieldRule.promptAudienceHint}`);
  }
  if (plan.task.fieldRule.promptAdaptationHint) {
    lines.push(`- Field guidance: ${plan.task.fieldRule.promptAdaptationHint}`);
  }

  for (const line of scenePolicyLines(plan.task)) {
    lines.push(`- ${line}`);
  }

  return [
    "Task policy (apply to tone, wording, and adaptation level; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildConstraintBlock(plan: TranslationPromptPlan): string | null {
  const lines: string[] = [];
  for (const hint of plan.constraints.fieldHints) {
    lines.push(`- ${hint.promptText} (${describeConstraintOrigin(hint.origin)})`);
  }
  if (plan.constraints.preserveHtmlStructure) {
    lines.push("- Preserve HTML structure and attribute-to-text relationships exactly");
  }
  if (plan.constraints.preserveJsonStructure) {
    lines.push("- Preserve JSON structure and configuration semantics strictly");
  }
  if (lines.length === 0) return null;
  return [
    "Field constraints (must follow these field-specific requirements; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildTerminologyBlock(
  terminology: TerminologyPromptContext | null,
  sourceText?: string | null,
): string | null {
  if (!terminology) return null;

  const brandTerms = cleanList(terminology.brandTerms, MAX_TERMS);
  const doNotTranslateTerms = cleanList(terminology.doNotTranslateTerms, MAX_TERMS);
  const seoTerms = cleanList(terminology.seoTerms, MAX_TERMS);
  const preferredTerms = (terminology.preferredTerms ?? [])
    .map((entry) => {
      const source = trim(entry?.source);
      if (!source) return null;
      const note = trim(entry?.note);
      return note ? `${source} -> ${note}` : source;
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, MAX_PREFERRED_TERMS);

  const normalizedSource = normalizeMatchBlob(sourceText);
  const filteredBrandTerms = filterTriggeredTerms(brandTerms, normalizedSource);
  const filteredDoNotTranslateTerms = filterTriggeredTerms(doNotTranslateTerms, normalizedSource);
  const filteredSeoTerms = filterTriggeredTerms(seoTerms, normalizedSource);
  const filteredPreferredTerms = preferredTerms.filter((entry) =>
    normalizedSource ? matchesPromptTerm(normalizedSource, entry.split(" -> ")[0] ?? entry) : true,
  );

  if (
    filteredBrandTerms.length === 0 &&
    filteredDoNotTranslateTerms.length === 0 &&
    filteredSeoTerms.length === 0 &&
    filteredPreferredTerms.length === 0
  ) {
    return null;
  }

  const lines: string[] = [];
  if (filteredBrandTerms.length > 0) {
    lines.push(`- Brand terms: ${filteredBrandTerms.join(", ")}`);
  }
  if (filteredDoNotTranslateTerms.length > 0) {
    lines.push(`- Keep unchanged: ${filteredDoNotTranslateTerms.join(", ")}`);
  }
  if (filteredPreferredTerms.length > 0) {
    lines.push(`- Preferred translations: ${filteredPreferredTerms.join("; ")}`);
  }
  if (filteredSeoTerms.length > 0) {
    lines.push(`- Search snippet terms (for meta title/meta description): ${filteredSeoTerms.join(", ")}`);
  }

  return [
    "Terminology policy (apply consistently; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildMarketContextBlock(market: MarketPromptContext | null): string | null {
  if (!market) return null;

  const marketNotes = cleanList(market.marketNotes, MAX_MARKET_NOTES);
  if (marketNotes.length === 0) return null;

  const lines: string[] = [];
  if (marketNotes.length > 0) {
    lines.push(`- Market notes: ${marketNotes.join("; ")}`);
  }

  return [
    "Market context (use as localization guidance; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildModulePolicyBlock(policy: ModulePolicyContext | null): string | null {
  if (!policy) return null;
  const tonePolicy = trim(policy.tonePolicy);
  const keywordPolicy = trim(policy.keywordPolicy);
  const literalVsAdaptive = trim(policy.literalVsAdaptive);
  if (!tonePolicy && !keywordPolicy && !literalVsAdaptive) return null;

  const lines: string[] = [];
  if (policy.module) lines.push(`- Module: ${policy.module}`);
  if (tonePolicy) lines.push(`- Tone policy: ${tonePolicy}`);
  if (keywordPolicy) lines.push(`- Keyword policy: ${keywordPolicy}`);
  if (literalVsAdaptive) lines.push(`- Literal vs adaptive: ${literalVsAdaptive}`);

  return [
    "Module policy (high-level module guidance; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function findBestThemeSceneHint(
  sceneHints: ThemeSceneHintContext[] | null | undefined,
  module: string | null,
  key: string,
  resourceId: string | null,
): ThemeSceneHintContext | null {
  if (!module || !sceneHints?.length) return null;
  const normalizedModule = module.trim().toUpperCase();
  const normalizedKey = normalizeSceneHintKey(key);
  const normalizedResource = normalizeResourcePattern(resourceId);
  const currentNamespace = extractAppNamespace(resourceId);
  let best: { hint: ThemeSceneHintContext; score: number } | null = null;

  for (const hint of sceneHints) {
    if ((hint.module ?? "").trim().toUpperCase() !== normalizedModule) continue;
    const pattern = normalizeSceneHintKey(hint.keyPattern);
    if (!pattern) continue;

    let score = 0;
    if (pattern === normalizedKey) score = 1;
    else if (normalizedKey.startsWith(pattern) || pattern.startsWith(normalizedKey)) score = 0.93;
    else if (normalizedKey.includes(pattern) || pattern.includes(normalizedKey)) score = 0.86;
    else continue;

    score += Math.max(0, Math.min(0.1, (hint.confidence ?? 0) * 0.1));
    const hintResource = normalizeResourcePattern(hint.resourcePattern);
    const hintNamespace = normalizeNamespace(hint.namespace);
    if (normalizedResource && hintResource) {
      if (normalizedResource === hintResource) score += 0.35;
      else if (
        normalizedResource.includes(hintResource) ||
        hintResource.includes(normalizedResource)
      ) {
        score += 0.18;
      } else {
        score -= 0.06;
      }
    }
    if (currentNamespace && hintNamespace) {
      if (currentNamespace === hintNamespace) score += 0.22;
      else score -= 0.04;
    }
    if (!best || score > best.score) best = { hint, score };
  }

  return best?.hint ?? null;
}

function applyThemeSceneHint(
  base: {
    promptProfileId: TranslationPromptProfileId;
    scene: TranslationScene;
    role: TranslationRole | null;
    contentClass: Exclude<FieldContentClass, "skip">;
    jsonMode: JsonMode | null;
  },
  hint: ThemeSceneHintContext,
): {
  promptProfileId: TranslationPromptProfileId;
  scene: TranslationScene;
  role: TranslationRole | null;
  contentClass: Exclude<FieldContentClass, "skip">;
  jsonMode: JsonMode | null;
} {
  const override = mapThemeHintToResolution(base.contentClass, hint.scene);
  if (!override) return base;
  return {
    ...base,
    promptProfileId: override.promptProfileId,
    scene: override.scene,
    role: coerceRole(hint.role) ?? base.role,
    jsonMode: override.jsonMode ?? base.jsonMode,
  };
}

function mapThemeHintToResolution(
  contentClass: Exclude<FieldContentClass, "skip">,
  hintScene: string,
): Pick<ResolvedTranslationPromptContext, "promptProfileId" | "scene" | "jsonMode"> | null {
  switch (hintScene) {
    case "marketing_hero":
      return { promptProfileId: "hero_v1", scene: "marketing_hero", jsonMode: null };
    case "announcement_bar":
      return { promptProfileId: "hero_v1", scene: "announcement_bar", jsonMode: null };
    case "navigation_ui":
      return { promptProfileId: "navigation_v1", scene: "navigation_ui", jsonMode: null };
    case "footer_info":
      return { promptProfileId: "navigation_v1", scene: "footer_info", jsonMode: null };
    case "product_supporting_copy":
      return { promptProfileId: "catalog_v1", scene: "product_catalog", jsonMode: null };
    case "editorial_copy":
      return { promptProfileId: "editorial_v1", scene: "editorial_copy", jsonMode: null };
    case "app_embedded_copy":
      return { promptProfileId: "theme_ui_v1", scene: "app_embedded_copy", jsonMode: null };
    case "config_like":
      return {
        promptProfileId: "config_json_v1",
        scene: "config_like",
        jsonMode: contentClass === "json" ? "config_json" : null,
      };
    case "theme_setting_copy":
    default:
      return { promptProfileId: "theme_ui_v1", scene: "theme_setting_copy", jsonMode: null };
  }
}

function coerceRole(role: string | null | undefined): TranslationRole | null {
  switch ((role ?? "").trim()) {
    case "heading":
    case "subheading":
    case "title":
    case "description":
    case "caption":
    case "button_label":
    case "menu_label":
    case "label":
    case "placeholder":
    case "body":
      return role as TranslationRole;
    default:
      return null;
  }
}

function normalizeSceneHintKey(key: string | null | undefined): string {
  return (key ?? "")
    .toLowerCase()
    .replace(/\[\d+\]/g, "[*]")
    .replace(/\d+/g, "*")
    .replace(/:{2,}/g, ":")
    .trim();
}

function normalizeResourcePattern(resourceId: string | null | undefined): string | null {
  const normalized = (resourceId ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeNamespace(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || null;
}

function extractAppNamespace(resourceId: string | null | undefined): string | null {
  const value = normalizeResourcePattern(resourceId);
  if (!value) return null;
  const match = value.match(/pagefly|gempage|judge\.?me|loox|bundle|popup|upsell|cross_sell|review|ecom|beae/i);
  if (!match?.[0]) return null;
  return normalizeNamespace(match[0].replace(/\.+/g, "."));
}

function scenePolicyLines(
  context: Pick<ResolvedTranslationPromptContext, "scene">,
): string[] {
  switch (context.scene) {
    case "marketing_hero":
      return [
        "Write like storefront marketing copy for shoppers.",
        "Prefer natural, concise, and native wording over literal translation when needed.",
        "Keep CTA-style text short, clear, and action-oriented.",
      ];
    case "announcement_bar":
      return [
        "Keep the message brief and storefront-friendly.",
        "Prefer concise promotional wording over verbose explanation.",
      ];
    case "navigation_ui":
      return [
        "Keep labels short, scannable, and familiar to shoppers.",
        "Prefer common e-commerce navigation wording over literal translation.",
      ];
    case "footer_info":
      return [
        "Keep wording concise and easy to scan in storefront footer/navigation areas.",
        "Do not over-market or over-explain.",
      ];
    case "theme_setting_copy":
      return [
        "Treat this as theme or UI-facing copy.",
        "Be conservative, clear, and consistent; avoid decorative rewriting.",
      ];
    case "editorial_copy":
      return [
        "Write naturally for longer-form editorial or explanatory content.",
        "Preserve structure and meaning while allowing natural sentence flow.",
      ];
    case "app_embedded_copy":
      return [
        "Treat this as embedded app/widget copy shown to storefront users.",
        "Be clear and natural, but avoid excessive marketing language.",
      ];
    case "config_like":
      return [
        "Translate only user-facing wording and preserve configuration semantics strictly.",
        "Do not expand, reinterpret, or rewrite technical/config meaning.",
      ];
    case "transactional_template":
      return [
        "Prioritize clarity, trustworthiness, and precision over creativity.",
        "Keep wording stable and suitable for notifications, policy, or operations copy.",
      ];
    case "strict_slug":
      return [
        "Keep the result suitable for a URL slug/handle.",
        "Prefer short, readable wording and avoid extra embellishment.",
      ];
    case "seo_copy":
      return [
        "Write naturally for meta title or meta description content shown in search-facing snippets.",
        "Preserve keyword intent while avoiding awkward keyword stuffing.",
      ];
    case "product_catalog":
    default:
      return [
        "Prioritize accuracy and product clarity for e-commerce catalog content.",
        "Keep brand and product-identifying wording stable; do not over-market.",
      ];
  }
}

function normalizeShopContext(profile: ShopPromptContext | null | undefined): ShopPromptContext | null {
  if (!profile) return null;
  if (
    !trim(profile.industry) &&
    !trim(profile.subIndustry) &&
    !trim(profile.brandTone) &&
    !trim(profile.brandPositioning)
  ) {
    return null;
  }
  return profile;
}

function shouldUseCatalogBrandContext(
  sourceText: string,
  role: TranslationRole | null,
): boolean {
  if (!sourceText) return false;
  if (role === "title" || role === "description" || role === "body" || role === "caption") {
    return true;
  }
  return sourceText.length >= 18 || countWords(sourceText) >= 4;
}

function shouldInjectTerminology(
  terminology: TerminologyPromptContext | null,
  sourceText: string,
): boolean {
  if (!terminology || !sourceText) return false;
  const normalizedSource = normalizeMatchBlob(sourceText);
  if (!normalizedSource) return false;
  const terms = [
    ...(terminology.brandTerms ?? []),
    ...(terminology.doNotTranslateTerms ?? []),
    ...(terminology.preferredTerms ?? []).map((entry) => entry?.source ?? ""),
    ...(terminology.seoTerms ?? []),
  ];
  return terms.some((term) => matchesPromptTerm(normalizedSource, term));
}

function filterTriggeredTerms(terms: string[], normalizedSource: string): string[] {
  if (!normalizedSource) return [];
  return terms.filter((term) => matchesPromptTerm(normalizedSource, term));
}

function matchesPromptTerm(normalizedSource: string, term: string): boolean {
  const normalizedTerm = normalizeMatchBlob(term);
  if (!normalizedTerm || normalizedTerm.length < 2) return false;
  return normalizedSource.includes(normalizedTerm);
}

function normalizeMatchBlob(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasRegionalVariant(locale: string | null | undefined): boolean {
  const normalized = (locale ?? "").trim();
  return /^[a-z]{2,3}[-_][a-z0-9]{2,}$/i.test(normalized);
}

function looksLikeShortUiCopy(sourceText: string, role: TranslationRole | null): boolean {
  if (role === "button_label" || role === "menu_label" || role === "label" || role === "placeholder") {
    return true;
  }
  const words = countWords(sourceText);
  return sourceText.length <= 32 && words <= 4;
}

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeTerminology(
  terminology: TerminologyPromptContext | null | undefined,
): TerminologyPromptContext | null {
  if (!terminology) return null;
  if (
    cleanList(terminology.brandTerms, MAX_TERMS).length === 0 &&
    cleanList(terminology.doNotTranslateTerms, MAX_TERMS).length === 0 &&
    cleanList(terminology.seoTerms, MAX_TERMS).length === 0 &&
    (terminology.preferredTerms ?? []).length === 0
  ) {
    return null;
  }
  return terminology;
}

function normalizeMarket(market: MarketPromptContext | null | undefined): MarketPromptContext | null {
  if (!market) return null;
  if (cleanList(market.marketNotes, MAX_MARKET_NOTES).length === 0) {
    return null;
  }
  return market;
}

function normalizeModulePolicy(
  policy: ModulePolicyContext | null | undefined,
  module: string | null,
): ModulePolicyContext | null {
  if (!policy) return null;
  const nextModule = trim(policy.module) ?? module;
  const tonePolicy = trim(policy.tonePolicy);
  const keywordPolicy = trim(policy.keywordPolicy);
  const literalVsAdaptive = trim(policy.literalVsAdaptive);
  if (!nextModule && !tonePolicy && !keywordPolicy && !literalVsAdaptive) return null;
  return {
    module: nextModule,
    tonePolicy,
    keywordPolicy,
    literalVsAdaptive,
  };
}

function trim(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function cleanList(
  values: string[] | null | undefined,
  max: number,
): string[] {
  return (values ?? [])
    .map((value) => trim(value))
    .filter((value): value is string => Boolean(value))
    .slice(0, max);
}

function resolvePromptConstraints(
  resolution: Pick<
    ResolvedTranslationPromptContext,
    "contentClass" | "fieldKind" | "scene" | "role"
  >,
): TranslationConstraintSet {
  const fieldHints = getTranslationFieldConstraintHints(resolution.fieldKind);
  const preserveHtmlStructure = resolution.contentClass === "html";
  const preserveJsonStructure = resolution.contentClass === "json";
  const noHtmlTagsInLeaf =
    resolution.contentClass === "html" ||
    resolution.contentClass === "json" ||
    resolution.contentClass === "list";
  const maxChars = fieldHints.find((hint) => hint.code === "max_chars")?.maxChars;
  const recommendedMaxChars = fieldHints.find(
    (hint) => hint.code === "recommended_max_chars",
  )?.maxChars;
  return {
    preserveHtmlStructure,
    preserveJsonStructure,
    preserveSentinels: true,
    preservePlaceholders: true,
    noHtmlTagsInLeaf,
    keepLeadingTrailingWhitespace: true,
    maxChars,
    recommendedMaxChars,
    mustBeSlugLike:
      fieldHints.some((hint) => hint.code === "slug_like") ||
      resolution.scene === "strict_slug",
    shortUiLabelPreferred:
      fieldHints.some((hint) => hint.code === "short_ui_label") ||
      resolution.role === "button_label" ||
      resolution.role === "menu_label" ||
      resolution.role === "label" ||
      resolution.role === "placeholder",
    fieldHints,
  };
}

function describeAudience(audience: TranslationAudience): string {
  switch (audience) {
    case "merchant":
      return "merchant-facing admin or configuration copy";
    case "system":
      return "system-facing identifier or structured value";
    case "shopper":
    default:
      return "shopper-facing storefront copy";
  }
}

function describeRewriteFreedom(rewriteFreedom: TranslationRewriteFreedom): string {
  switch (rewriteFreedom) {
    case "strict":
      return "stay very close to the source wording";
    case "adaptive":
      return "allow moderate adaptation while preserving intent";
    case "balanced":
    default:
      return "balance accuracy with natural phrasing";
  }
}

function describeConstraintOrigin(origin: TranslationConstraintOrigin): string {
  return origin === "documented" ? "documented platform constraint" : "heuristic guidance";
}

function computeStyleContextScore(
  context: Pick<
    ResolvedTranslationPromptContext,
    "audience" | "rewriteFreedom" | "scene" | "fieldKind" | "role"
  >,
  sourceText: string,
  isShortUiCopy: boolean,
): number {
  if (context.audience !== "shopper" || context.rewriteFreedom === "strict" || isShortUiCopy) {
    return 0;
  }
  let score = 0;
  if (
    context.scene === "marketing_hero" ||
    context.scene === "announcement_bar" ||
    context.scene === "editorial_copy" ||
    context.scene === "seo_copy"
  ) {
    score += 2;
  }
  if (
    context.fieldKind === "title" ||
    context.fieldKind === "description" ||
    context.fieldKind === "body"
  ) {
    score += 1;
  }
  if (
    context.scene === "product_catalog" &&
    shouldUseCatalogBrandContext(sourceText, context.role)
  ) {
    score += 1;
  }
  if (sourceText.length >= 40 || countWords(sourceText) >= 8) score += 1;
  return score;
}

function computeMarketContextScore(
  context: Pick<ResolvedTranslationPromptContext, "scene" | "rewriteFreedom">,
  sourceText: string,
  targetLocale?: string | null,
): number {
  let score = 0;
  if (hasRegionalVariant(targetLocale)) score += 1;
  if (
    context.scene === "marketing_hero" ||
    context.scene === "announcement_bar" ||
    context.scene === "editorial_copy" ||
    context.scene === "seo_copy"
  ) {
    score += 1;
  }
  if (context.rewriteFreedom === "adaptive") score += 1;
  if (looksMarketSensitive(sourceText)) score += 1;
  return score;
}

function shouldInjectModulePolicy(
  context: Pick<ResolvedTranslationPromptContext, "scene" | "rewriteFreedom" | "modulePolicy">,
  isShortUiCopy: boolean,
  sourceText: string,
): boolean {
  if (!context.modulePolicy) return false;
  if (context.rewriteFreedom === "strict") return true;
  if (isShortUiCopy) return false;
  if (context.scene === "navigation_ui" || context.scene === "footer_info") return false;
  return sourceText.length >= 24 || countWords(sourceText) >= 5;
}

function looksMarketSensitive(sourceText: string): boolean {
  if (!sourceText) return false;
  return /shipping|delivery|tax|vat|currency|returns|warranty|size|region|market/i.test(
    sourceText,
  );
}
