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
const MAX_DEFAULT_SITE_TERMS = 4;
const MAX_DEFAULT_PROFESSIONAL_TERMS = 4;
const MAX_DEFAULT_SEO_TERMS = 3;

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
  const sourceText = options?.sourceText ?? "";
  const terminologyBlocks = plan.selection.terminology
    ? buildTerminologyBlocks(context.terminology, context, sourceText)
    : [];
  const blocks = [
    buildConstraintBlock(plan),
    ...terminologyBlocks,
    buildTaskPolicyBlock(plan),
    plan.selection.modulePolicy
      ? buildModulePolicyBlockWithSelection(context.modulePolicy, context, {
          sourceText: options?.sourceText,
        })
      : null,
    plan.selection.shopContext
      ? buildShopContextBlockWithSelection(context.shopContext, context, {
          sourceText: options?.sourceText,
        })
      : null,
    plan.selection.market
      ? buildMarketContextBlockWithSelection(context.market, context, {
          sourceText: options?.sourceText,
          targetLocale: options?.targetLocale,
        })
      : null,
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
  const terminologyTriggered = shouldInjectTerminology(context.terminology, context, sourceText);
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

function buildShopContextBlockWithSelection(
  profile: ShopPromptContext | null,
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  options?: {
    sourceText?: string | null;
  },
): string | null {
  if (!profile) return null;

  const sourceText = trim(options?.sourceText) ?? "";
  const industry = trim(profile.industry);
  const subIndustry = trim(profile.subIndustry);
  const brandTone = trim(profile.brandTone);
  const brandPositioning = trim(profile.brandPositioning);

  const lines: string[] = [];
  if (brandTone && shouldInjectBrandToneContext(context, sourceText)) {
    lines.push(`- Brand tone: ${brandTone}`);
  }
  if (brandPositioning && shouldInjectBrandPositioningContext(context, sourceText)) {
    lines.push(`- Brand positioning: ${brandPositioning}`);
  }
  if ((industry || subIndustry) && shouldInjectCategoryContext(context, sourceText, industry, subIndustry)) {
    lines.push(`- Category context: ${industry ?? ""}${industry && subIndustry ? " / " : ""}${subIndustry ?? ""}`);
  }

  if (lines.length === 0) return null;

  return [
    "Style context (use only when it helps tone and wording; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildTaskPolicyBlock(plan: TranslationPromptPlan): string | null {
  const lines = [...scenePolicyLines(plan.task)];
  const fieldLine = buildFieldPolicyLine(plan.task);
  if (fieldLine) lines.unshift(fieldLine);
  if (lines.length === 0) return null;

  return [
    "Task policy (apply to tone, wording, and adaptation level; do NOT translate or output this block):",
    ...lines.map((line) => `- ${line}`),
  ].join("\n");
}

function buildConstraintBlock(plan: TranslationPromptPlan): string | null {
  const lines: string[] = [];
  if (plan.constraints.preserveHtmlStructure) {
    lines.push("- Preserve HTML structure and attribute-to-text relationships exactly");
  }
  if (plan.constraints.preserveJsonStructure) {
    lines.push("- Preserve JSON structure and configuration semantics strictly");
  }
  const fieldHints = plan.constraints.fieldHints
    .filter((hint) => !isTaskLevelConstraintHint(hint.code))
    .sort((left, right) => {
      const originWeight = (origin: "documented" | "heuristic") =>
        origin === "documented" ? 0 : 1;
      return originWeight(left.origin) - originWeight(right.origin);
    });
  for (const hint of fieldHints) {
    lines.push(`- ${hint.promptText}`);
  }
  if (lines.length === 0) return null;
  return [
    "Field constraints (must follow these field-specific requirements; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function buildTerminologyBlocks(
  terminology: TerminologyPromptContext | null,
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText?: string | null,
): string[] {
  if (!terminology) return [];
  const source = sourceText ?? "";

  const brandTerms = cleanList(terminology.brandTerms, MAX_TERMS);
  const doNotTranslateTerms = cleanList(terminology.doNotTranslateTerms, MAX_TERMS);
  const seoTerms = cleanList(terminology.seoTerms, MAX_TERMS);
  const preferredTerms = (terminology.preferredTerms ?? [])
    .map((entry) => {
      const source = trim(entry?.source);
      if (!source) return null;
      const note = trim(entry?.note);
      return {
        source,
        rendered: note ? `${source} -> ${note}` : source,
      };
    })
    .filter((value): value is { source: string; rendered: string } => Boolean(value))
    .slice(0, MAX_PREFERRED_TERMS);

  const normalizedSource = normalizeMatchBlob(source);
  const brandTermsHit = filterTriggeredTerms(brandTerms, normalizedSource);
  const doNotTranslateTermsHit = filterTriggeredTerms(doNotTranslateTerms, normalizedSource);
  const seoTermsHit = filterTriggeredTerms(seoTerms, normalizedSource);
  const preferredTermsHit = preferredTerms.filter((entry) =>
    normalizedSource ? matchesPromptTerm(normalizedSource, entry.source) : true,
  );
  const useDefaultTerms = shouldUseModuleTerminology(context);
  const filteredBrandTerms =
    brandTermsHit.length > 0
      ? brandTermsHit
      : useDefaultTerms
        ? brandTerms.slice(0, MAX_DEFAULT_SITE_TERMS)
        : [];
  const filteredDoNotTranslateTerms =
    doNotTranslateTermsHit.length > 0
      ? doNotTranslateTermsHit
      : useDefaultTerms
        ? doNotTranslateTerms.slice(0, MAX_DEFAULT_SITE_TERMS)
        : [];
  const filteredSeoTerms =
    seoTermsHit.length > 0
      ? seoTermsHit
      : useDefaultTerms && context?.scene === "seo_copy"
        ? seoTerms.slice(0, MAX_DEFAULT_SEO_TERMS)
        : [];
  const filteredPreferredTerms =
    preferredTermsHit.length > 0
      ? preferredTermsHit
      : useDefaultTerms
        ? preferredTerms.slice(0, MAX_DEFAULT_PROFESSIONAL_TERMS)
        : [];

  if (
    filteredBrandTerms.length === 0 &&
    filteredDoNotTranslateTerms.length === 0 &&
    filteredSeoTerms.length === 0 &&
    filteredPreferredTerms.length === 0
  ) {
    return [];
  }

  const siteSpecificLines: string[] = [];
  if (filteredBrandTerms.length > 0) {
    siteSpecificLines.push(`- Brand terms: ${filteredBrandTerms.join(", ")}`);
  }
  if (filteredDoNotTranslateTerms.length > 0) {
    siteSpecificLines.push(`- Keep unchanged: ${filteredDoNotTranslateTerms.join(", ")}`);
  }

  const professionalLines: string[] = [];
  if (filteredPreferredTerms.length > 0) {
    professionalLines.push(
      `- Preferred translations: ${filteredPreferredTerms.map((entry) => entry.rendered).join("; ")}`,
    );
  }
  if (filteredSeoTerms.length > 0) {
    professionalLines.push(
      `- Search snippet terms (for meta title/meta description): ${filteredSeoTerms.join(", ")}`,
    );
  }

  const blocks: string[] = [];
  if (siteSpecificLines.length > 0) {
    blocks.push(
      [
        "Brand / site-specific term policy (preserve site identity consistently; do NOT translate or output this block):",
        ...siteSpecificLines,
      ].join("\n"),
    );
  }
  if (professionalLines.length > 0) {
    blocks.push(
      [
        "Professional terminology policy (use domain-appropriate wording consistently; do NOT translate or output this block):",
        ...professionalLines,
      ].join("\n"),
    );
  }

  return blocks;
}

function buildMarketContextBlockWithSelection(
  market: MarketPromptContext | null,
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  options?: {
    sourceText?: string | null;
    targetLocale?: string | null;
  },
): string | null {
  if (!market) return null;

  const sourceText = trim(options?.sourceText) ?? "";
  const marketNotes = cleanList(market.marketNotes, MAX_MARKET_NOTES).filter((note) =>
    shouldInjectMarketNote(note, context, sourceText, options?.targetLocale),
  );
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

function buildModulePolicyBlockWithSelection(
  policy: ModulePolicyContext | null,
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  options?: {
    sourceText?: string | null;
  },
): string | null {
  if (!policy) return null;
  const sourceText = trim(options?.sourceText) ?? "";
  const tonePolicy = trim(policy.tonePolicy);
  const keywordPolicy = trim(policy.keywordPolicy);
  const literalVsAdaptive = trim(policy.literalVsAdaptive);
  if (!tonePolicy && !keywordPolicy && !literalVsAdaptive) return null;

  const lines: string[] = [];
  if (tonePolicy && shouldInjectModuleTonePolicy(context, sourceText)) {
    lines.push(`- Tone policy: ${tonePolicy}`);
  }
  if (keywordPolicy && shouldInjectModuleKeywordPolicy(context, sourceText)) {
    lines.push(`- Keyword policy: ${keywordPolicy}`);
  }
  if (literalVsAdaptive && shouldInjectLiteralAdaptivePolicy(context, sourceText)) {
    lines.push(`- Literal vs adaptive: ${literalVsAdaptive}`);
  }
  if (lines.length === 0) return null;

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
  context: Pick<ResolvedTranslationPromptContext, "scene" | "role" | "fieldKind">,
): string[] {
  switch (context.scene) {
    case "marketing_hero":
      if (context.role === "button_label" || context.fieldKind === "ui_label") {
        return [];
      }
      return ["Write concise storefront marketing copy for shoppers."];
    case "announcement_bar":
      return ["Keep the message brief and storefront-friendly."];
    case "navigation_ui":
      if (context.fieldKind === "ui_label") return [];
      return ["Keep labels short, scannable, and familiar to shoppers."];
    case "footer_info":
      return ["Keep wording concise and easy to scan in storefront footer/navigation areas."];
    case "theme_setting_copy":
      if (context.fieldKind === "ui_label") return [];
      return ["Treat this as theme or UI-facing copy; be conservative and consistent."];
    case "editorial_copy":
      return ["Write naturally for longer-form editorial content while preserving structure and meaning."];
    case "app_embedded_copy":
      return ["Treat this as embedded app/widget copy; be clear and natural without extra marketing language."];
    case "config_like":
      return ["Translate only user-facing wording and preserve configuration semantics strictly."];
    case "transactional_template":
      return ["Prioritize clarity, trustworthiness, and precision over creativity."];
    case "strict_slug":
      return ["Keep the result suitable for a URL slug/handle."];
    case "seo_copy":
      return ["Preserve keyword intent while avoiding awkward keyword stuffing."];
    case "product_catalog":
    default:
      return [];
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

function shouldInjectBrandToneContext(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
): boolean {
  if (!context || !sourceText) return false;
  if (context.audience !== "shopper" || context.rewriteFreedom === "strict") return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) return false;

  if (
    context.scene === "marketing_hero" ||
    context.scene === "announcement_bar" ||
    context.scene === "editorial_copy" ||
    context.scene === "seo_copy"
  ) {
    return true;
  }

  return sourceText.length >= 40 || countWords(sourceText) >= 8;
}

function shouldInjectBrandPositioningContext(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
): boolean {
  if (!context || !sourceText) return false;
  if (context.audience !== "shopper" || context.rewriteFreedom === "strict") return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) return false;

  if (
    context.fieldKind === "title" ||
    context.fieldKind === "description" ||
    context.fieldKind === "body"
  ) {
    return sourceText.length >= 24 || countWords(sourceText) >= 5;
  }

  return (
    context.scene === "marketing_hero" ||
    context.scene === "editorial_copy" ||
    context.scene === "seo_copy"
  ) && (sourceText.length >= 24 || countWords(sourceText) >= 5);
}

function shouldInjectCategoryContext(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
  industry: string | null,
  subIndustry: string | null,
): boolean {
  if (!context) return false;
  const categoryBlob = normalizeMatchBlob([industry, subIndustry].filter(Boolean).join(" "));
  const normalizedSource = normalizeMatchBlob(sourceText);
  if (categoryBlob && normalizedSource && matchesPromptTerm(normalizedSource, categoryBlob)) {
    return true;
  }
  if (!sourceText) return false;
  if (context.audience !== "shopper" || context.rewriteFreedom === "strict") return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) return false;

  return (
    context.scene === "product_catalog" ||
    context.scene === "seo_copy" ||
    context.scene === "editorial_copy"
  ) && (sourceText.length >= 32 || countWords(sourceText) >= 6);
}

function shouldInjectMarketNote(
  note: string,
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
  targetLocale?: string | null,
): boolean {
  if (!context || !note) return false;
  if (context.audience !== "shopper") return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) {
    return noteTargetsLocale(note, targetLocale);
  }

  const normalizedSource = normalizeMatchBlob(sourceText);
  const normalizedNote = normalizeMatchBlob(note);
  if (normalizedSource && normalizedNote && hasKeywordOverlap(normalizedSource, normalizedNote)) {
    return true;
  }
  if (noteTargetsLocale(note, targetLocale)) return true;
  if (looksMarketSensitive(sourceText) && noteLooksMarketSpecific(note)) return true;
  return false;
}

function shouldInjectModuleTonePolicy(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
): boolean {
  if (!context || !sourceText) return false;
  if (context.audience !== "shopper" || context.rewriteFreedom === "strict") return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) return false;

  return (
    context.scene === "marketing_hero" ||
    context.scene === "announcement_bar" ||
    context.scene === "editorial_copy" ||
    context.scene === "seo_copy" ||
    context.scene === "app_embedded_copy"
  ) && (sourceText.length >= 24 || countWords(sourceText) >= 5);
}

function shouldInjectModuleKeywordPolicy(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
): boolean {
  if (!context || !sourceText) return false;
  if (context.audience !== "shopper") return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) return false;

  return (
    context.scene === "product_catalog" ||
    context.scene === "seo_copy" ||
    context.scene === "editorial_copy"
  ) && (sourceText.length >= 20 || countWords(sourceText) >= 4);
}

function shouldInjectLiteralAdaptivePolicy(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
): boolean {
  if (!context || !sourceText) return false;
  if (looksLikeShortUiCopy(sourceText, context.role)) return false;
  if (context.rewriteFreedom === "strict") return true;

  return (
    context.scene === "product_catalog" ||
    context.scene === "seo_copy" ||
    context.scene === "editorial_copy" ||
    context.scene === "marketing_hero" ||
    context.scene === "announcement_bar"
  ) && (sourceText.length >= 20 || countWords(sourceText) >= 4);
}

function shouldInjectTerminology(
  terminology: TerminologyPromptContext | null,
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
  sourceText: string,
): boolean {
  if (!terminology) return false;
  if (shouldUseModuleTerminology(context)) return true;
  if (!sourceText) return false;
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

function shouldUseModuleTerminology(
  context: Pick<
    ResolvedTranslationPromptContext,
    "scene" | "role" | "fieldKind" | "rewriteFreedom" | "audience"
  > | null,
): boolean {
  if (!context) return false;
  if (context.audience !== "shopper") return false;
  if (
    context.scene !== "product_catalog" &&
    context.scene !== "editorial_copy" &&
    context.scene !== "seo_copy"
  ) {
    return false;
  }
  return (
    context.fieldKind === "title" ||
    context.fieldKind === "description" ||
    context.fieldKind === "body"
  );
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

function hasKeywordOverlap(left: string, right: string): boolean {
  const leftTokens = tokenizePromptText(left);
  const rightTokens = tokenizePromptText(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  const rightSet = new Set(rightTokens);
  return leftTokens.some((token) => token.length >= 4 && rightSet.has(token));
}

function tokenizePromptText(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
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

function noteLooksMarketSpecific(note: string): boolean {
  return /shipping|delivery|tax|vat|currency|returns|warranty|size|region|market|eu|europe|us|uk/i.test(
    note,
  );
}

function noteTargetsLocale(note: string, targetLocale?: string | null): boolean {
  const normalizedNote = (note ?? "").toLowerCase();
  const normalizedLocale = (targetLocale ?? "").toLowerCase().replace("_", "-");
  if (!normalizedNote || !normalizedLocale) return false;
  const language = normalizedLocale.split("-")[0] ?? normalizedLocale;

  if (language === "fr" && /french|france|francophone/.test(normalizedNote)) return true;
  if (language === "de" && /german|germany/.test(normalizedNote)) return true;
  if (language === "es" && /spanish|spain/.test(normalizedNote)) return true;
  if (language === "it" && /italian|italy/.test(normalizedNote)) return true;
  if (language === "pt" && /portuguese|portugal|brazil/.test(normalizedNote)) return true;
  if (language === "nl" && /dutch|netherlands/.test(normalizedNote)) return true;
  if (language === "ja" && /japanese|japan/.test(normalizedNote)) return true;
  if (language === "zh" && /chinese|china|taiwan|hong kong/.test(normalizedNote)) return true;
  if (language === "ko" && /korean|korea/.test(normalizedNote)) return true;
  if (language === "ar" && /arabic|middle east|gcc/.test(normalizedNote)) return true;

  if (/eu|europe|vat/.test(normalizedNote) && /^(fr|de|es|it|nl|pt|pl|sv|da|fi|cs|sk|sl|hu|ro|bg|el|hr|lt|lv|et)(-|$)/.test(normalizedLocale)) {
    return true;
  }

  return false;
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

function buildFieldPolicyLine(
  task: Pick<TranslationPromptPlan["task"], "role" | "fieldRule" | "fieldKind" | "contentClass">,
): string | null {
  if (task.fieldKind === "title") {
    return "Treat this as a shopper-facing title and keep it concise and stable.";
  }
  if (task.fieldKind === "seo_title") {
    return "Treat this as a search-facing meta title.";
  }
  if (task.fieldKind === "seo_description") {
    return "Treat this as a search-facing meta description.";
  }
  if (task.role === "button_label") {
    return "Treat this as CTA-style button copy.";
  }
  if (task.fieldKind === "ui_label") {
    return "Treat this as short UI copy.";
  }
  if (task.contentClass === "json") {
    return "Translate only user-facing wording inside the structured value.";
  }
  return null;
}

function isTaskLevelConstraintHint(
  code: TranslationConstraintSet["fieldHints"][number]["code"],
): boolean {
  return (
    code === "short_ui_label" ||
    code === "search_snippet_title" ||
    code === "search_snippet_description"
  );
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
    context.scene === "product_catalog" &&
    shouldUseCatalogBrandContext(sourceText, context.role)
  ) {
    score += 1;
  }
  if (context.scene !== "product_catalog" && (sourceText.length >= 40 || countWords(sourceText) >= 8)) {
    score += 1;
  }
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
