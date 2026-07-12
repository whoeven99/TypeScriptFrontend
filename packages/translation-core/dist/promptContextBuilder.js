import { resolveTranslationScene, } from "./translationSceneResolver.js";
const MAX_KEYWORDS = 12;
const MAX_SELLING_POINTS = 5;
const MAX_DESCRIPTION_CHARS = 280;
const MAX_TERMS = 12;
const MAX_PREFERRED_TERMS = 10;
const MAX_MARKET_NOTES = 6;
const MAX_PUBLISHED_LOCALES = 12;
const MAX_CURRENCIES = 8;
export function buildResolvedPromptContext(args) {
    const baseResolution = resolveTranslationScene({
        module: args.module ?? args.base?.module,
        key: args.key,
        contentClass: args.contentClass,
        shopifyType: args.shopifyType,
    });
    const sceneHint = findBestThemeSceneHint(args.base?.themeSceneProfile?.sceneHints, baseResolution.module, args.key, args.resourceId ?? args.base?.resourceId ?? null);
    const resolution = sceneHint && (sceneHint.confidence ?? 0) >= 0.78
        ? applyThemeSceneHint(baseResolution, sceneHint)
        : baseResolution;
    const modulePolicy = normalizeModulePolicy(args.base?.modulePolicy, baseResolution.module ?? args.base?.module ?? null);
    return {
        ...resolution,
        module: baseResolution.module ?? args.base?.module ?? null,
        shopContext: normalizeShopContext(args.base?.shopContext),
        terminology: normalizeTerminology(args.base?.terminology),
        market: normalizeMarket(args.base?.market),
        modulePolicy,
    };
}
export function buildPromptContextBlock(context) {
    const blocks = [
        buildShopContextBlock(context.shopContext),
        buildTerminologyBlock(context.terminology),
        buildMarketContextBlock(context.market),
        buildScenePolicyBlock(context),
        buildModulePolicyBlock(context.modulePolicy),
    ].filter(Boolean);
    return blocks.length > 0 ? blocks.join("\n\n") : null;
}
function buildShopContextBlock(profile) {
    if (!profile)
        return null;
    const industry = trim(profile.industry);
    const subIndustry = trim(profile.subIndustry);
    const brandTone = trim(profile.brandTone);
    const brandPositioning = trim(profile.brandPositioning);
    const description = truncate(trim(profile.description) ?? "", MAX_DESCRIPTION_CHARS);
    const priceRange = trim(profile.priceRange);
    const keywords = (profile.keywords ?? [])
        .map((value) => trim(value))
        .filter(Boolean)
        .slice(0, MAX_KEYWORDS);
    const sellingPoints = (profile.sellingPoints ?? [])
        .map((value) => trim(value))
        .filter(Boolean)
        .slice(0, MAX_SELLING_POINTS);
    const lines = [];
    if (industry)
        lines.push(`- Industry / category: ${industry}`);
    if (subIndustry)
        lines.push(`- Sub-category: ${subIndustry}`);
    if (brandTone)
        lines.push(`- Brand voice / tone: ${brandTone}`);
    if (brandPositioning)
        lines.push(`- Brand positioning: ${brandPositioning}`);
    if (priceRange)
        lines.push(`- Price positioning: ${priceRange}`);
    if (keywords.length > 0)
        lines.push(`- Key terms: ${keywords.join(", ")}`);
    if (sellingPoints.length > 0)
        lines.push(`- Selling points: ${sellingPoints.join("; ")}`);
    if (description)
        lines.push(`- About the shop: ${description}`);
    if (lines.length === 0)
        return null;
    return [
        "Shop context (background guidance for tone, terminology, and localization; do NOT translate or output this block):",
        ...lines,
    ].join("\n");
}
function buildScenePolicyBlock(context) {
    const lines = [
        `- Prompt profile: ${context.promptProfileId}`,
        `- Scene: ${context.scene}`,
    ];
    if (context.role)
        lines.push(`- Role: ${context.role}`);
    if (context.module)
        lines.push(`- Module: ${context.module}`);
    lines.push(`- Content class: ${context.contentClass}`);
    if (context.jsonMode)
        lines.push(`- JSON mode: ${context.jsonMode}`);
    for (const line of scenePolicyLines(context)) {
        lines.push(`- ${line}`);
    }
    return [
        "Scene policy (apply to tone, wording, and adaptation level; do NOT translate or output this block):",
        ...lines,
    ].join("\n");
}
function buildTerminologyBlock(terminology) {
    if (!terminology)
        return null;
    const brandTerms = cleanList(terminology.brandTerms, MAX_TERMS);
    const doNotTranslateTerms = cleanList(terminology.doNotTranslateTerms, MAX_TERMS);
    const seoTerms = cleanList(terminology.seoTerms, MAX_TERMS);
    const preferredTerms = (terminology.preferredTerms ?? [])
        .map((entry) => {
        const source = trim(entry?.source);
        if (!source)
            return null;
        const note = trim(entry?.note);
        return note ? `${source} -> ${note}` : source;
    })
        .filter((value) => Boolean(value))
        .slice(0, MAX_PREFERRED_TERMS);
    if (brandTerms.length === 0 &&
        doNotTranslateTerms.length === 0 &&
        seoTerms.length === 0 &&
        preferredTerms.length === 0) {
        return null;
    }
    const lines = [];
    if (brandTerms.length > 0)
        lines.push(`- Brand terms: ${brandTerms.join(", ")}`);
    if (doNotTranslateTerms.length > 0) {
        lines.push(`- Keep unchanged: ${doNotTranslateTerms.join(", ")}`);
    }
    if (preferredTerms.length > 0) {
        lines.push(`- Preferred translations: ${preferredTerms.join("; ")}`);
    }
    if (seoTerms.length > 0)
        lines.push(`- SEO terms: ${seoTerms.join(", ")}`);
    return [
        "Terminology policy (apply consistently; do NOT translate or output this block):",
        ...lines,
    ].join("\n");
}
function buildMarketContextBlock(market) {
    if (!market)
        return null;
    const publishedLocales = cleanList(market.publishedLocales, MAX_PUBLISHED_LOCALES);
    const marketNotes = cleanList(market.marketNotes, MAX_MARKET_NOTES);
    const currencyContext = cleanList(market.currencyContext, MAX_CURRENCIES);
    if (publishedLocales.length === 0 &&
        marketNotes.length === 0 &&
        currencyContext.length === 0) {
        return null;
    }
    const lines = [];
    if (publishedLocales.length > 0) {
        lines.push(`- Published locales: ${publishedLocales.join(", ")}`);
    }
    if (currencyContext.length > 0) {
        lines.push(`- Currency context: ${currencyContext.join(", ")}`);
    }
    if (marketNotes.length > 0) {
        lines.push(`- Market notes: ${marketNotes.join("; ")}`);
    }
    return [
        "Market context (use as localization guidance; do NOT translate or output this block):",
        ...lines,
    ].join("\n");
}
function buildModulePolicyBlock(policy) {
    if (!policy)
        return null;
    const tonePolicy = trim(policy.tonePolicy);
    const keywordPolicy = trim(policy.keywordPolicy);
    const literalVsAdaptive = trim(policy.literalVsAdaptive);
    if (!tonePolicy && !keywordPolicy && !literalVsAdaptive)
        return null;
    const lines = [];
    if (policy.module)
        lines.push(`- Module: ${policy.module}`);
    if (tonePolicy)
        lines.push(`- Tone policy: ${tonePolicy}`);
    if (keywordPolicy)
        lines.push(`- Keyword policy: ${keywordPolicy}`);
    if (literalVsAdaptive)
        lines.push(`- Literal vs adaptive: ${literalVsAdaptive}`);
    return [
        "Module policy (high-level module guidance; do NOT translate or output this block):",
        ...lines,
    ].join("\n");
}
function findBestThemeSceneHint(sceneHints, module, key, resourceId) {
    if (!module || !sceneHints?.length)
        return null;
    const normalizedModule = module.trim().toUpperCase();
    const normalizedKey = normalizeSceneHintKey(key);
    const normalizedResource = normalizeResourcePattern(resourceId);
    const currentNamespace = extractAppNamespace(resourceId);
    let best = null;
    for (const hint of sceneHints) {
        if ((hint.module ?? "").trim().toUpperCase() !== normalizedModule)
            continue;
        const pattern = normalizeSceneHintKey(hint.keyPattern);
        if (!pattern)
            continue;
        let score = 0;
        if (pattern === normalizedKey)
            score = 1;
        else if (normalizedKey.startsWith(pattern) || pattern.startsWith(normalizedKey))
            score = 0.93;
        else if (normalizedKey.includes(pattern) || pattern.includes(normalizedKey))
            score = 0.86;
        else
            continue;
        score += Math.max(0, Math.min(0.1, (hint.confidence ?? 0) * 0.1));
        const hintResource = normalizeResourcePattern(hint.resourcePattern);
        const hintNamespace = normalizeNamespace(hint.namespace);
        if (normalizedResource && hintResource) {
            if (normalizedResource === hintResource)
                score += 0.35;
            else if (normalizedResource.includes(hintResource) ||
                hintResource.includes(normalizedResource)) {
                score += 0.18;
            }
            else {
                score -= 0.06;
            }
        }
        if (currentNamespace && hintNamespace) {
            if (currentNamespace === hintNamespace)
                score += 0.22;
            else
                score -= 0.04;
        }
        if (!best || score > best.score)
            best = { hint, score };
    }
    return best?.hint ?? null;
}
function applyThemeSceneHint(base, hint) {
    const override = mapThemeHintToResolution(base.contentClass, hint.scene);
    if (!override)
        return base;
    return {
        ...base,
        promptProfileId: override.promptProfileId,
        scene: override.scene,
        role: coerceRole(hint.role) ?? base.role,
        jsonMode: override.jsonMode ?? base.jsonMode,
    };
}
function mapThemeHintToResolution(contentClass, hintScene) {
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
function coerceRole(role) {
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
            return role;
        default:
            return null;
    }
}
function normalizeSceneHintKey(key) {
    return (key ?? "")
        .toLowerCase()
        .replace(/\[\d+\]/g, "[*]")
        .replace(/\d+/g, "*")
        .replace(/:{2,}/g, ":")
        .trim();
}
function normalizeResourcePattern(resourceId) {
    const normalized = (resourceId ?? "").trim().toLowerCase();
    return normalized || null;
}
function normalizeNamespace(value) {
    const normalized = (value ?? "").trim().toLowerCase();
    return normalized || null;
}
function extractAppNamespace(resourceId) {
    const value = normalizeResourcePattern(resourceId);
    if (!value)
        return null;
    const match = value.match(/pagefly|gempage|judge\.?me|loox|bundle|popup|upsell|cross_sell|review|ecom|beae/i);
    if (!match?.[0])
        return null;
    return normalizeNamespace(match[0].replace(/\.+/g, "."));
}
function scenePolicyLines(context) {
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
                "Write naturally for search-facing copy.",
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
function normalizeShopContext(profile) {
    if (!profile)
        return null;
    if (!trim(profile.industry) &&
        !trim(profile.subIndustry) &&
        !trim(profile.brandTone) &&
        !trim(profile.brandPositioning) &&
        !trim(profile.description) &&
        (profile.keywords ?? []).length === 0 &&
        (profile.sellingPoints ?? []).length === 0 &&
        !trim(profile.priceRange)) {
        return null;
    }
    return profile;
}
function normalizeTerminology(terminology) {
    if (!terminology)
        return null;
    if (cleanList(terminology.brandTerms, MAX_TERMS).length === 0 &&
        cleanList(terminology.doNotTranslateTerms, MAX_TERMS).length === 0 &&
        cleanList(terminology.seoTerms, MAX_TERMS).length === 0 &&
        (terminology.preferredTerms ?? []).length === 0) {
        return null;
    }
    return terminology;
}
function normalizeMarket(market) {
    if (!market)
        return null;
    if (cleanList(market.publishedLocales, MAX_PUBLISHED_LOCALES).length === 0 &&
        cleanList(market.marketNotes, MAX_MARKET_NOTES).length === 0 &&
        cleanList(market.currencyContext, MAX_CURRENCIES).length === 0) {
        return null;
    }
    return market;
}
function normalizeModulePolicy(policy, module) {
    if (!policy)
        return null;
    const nextModule = trim(policy.module) ?? module;
    const tonePolicy = trim(policy.tonePolicy);
    const keywordPolicy = trim(policy.keywordPolicy);
    const literalVsAdaptive = trim(policy.literalVsAdaptive);
    if (!nextModule && !tonePolicy && !keywordPolicy && !literalVsAdaptive)
        return null;
    return {
        module: nextModule,
        tonePolicy,
        keywordPolicy,
        literalVsAdaptive,
    };
}
function trim(value) {
    if (typeof value !== "string")
        return null;
    const normalized = value.trim();
    return normalized || null;
}
function cleanList(values, max) {
    return (values ?? [])
        .map((value) => trim(value))
        .filter((value) => Boolean(value))
        .slice(0, max);
}
function truncate(text, maxLen) {
    if (text.length <= maxLen)
        return text;
    return `${text.slice(0, maxLen).trimEnd()}…`;
}
//# sourceMappingURL=promptContextBuilder.js.map