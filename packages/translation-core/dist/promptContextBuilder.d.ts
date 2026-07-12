import { type FieldContentClass, type JsonMode, type TranslationPromptProfileId, type TranslationRole, type TranslationScene } from "./translationSceneResolver.js";
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
    preferredTerms?: Array<{
        source: string;
        note?: string | null;
    }> | null;
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
    shopContext: ShopPromptContext | null;
    terminology: TerminologyPromptContext | null;
    market: MarketPromptContext | null;
    modulePolicy: ModulePolicyContext | null;
};
export type PromptContextBlockSelection = {
    shopContext: boolean;
    terminology: boolean;
    market: boolean;
    modulePolicy: boolean;
    scenePolicy: true;
};
export declare function buildResolvedPromptContext(args: {
    module?: string | null;
    resourceId?: string | null;
    key: string;
    contentClass: Exclude<FieldContentClass, "skip">;
    shopifyType?: string | null;
    base?: TranslationPromptContextInput | null;
}): ResolvedTranslationPromptContext;
export declare function buildPromptContextBlock(context: ResolvedTranslationPromptContext, options?: {
    sourceText?: string | null;
    targetLocale?: string | null;
}): string | null;
export declare function selectPromptContextBlocks(context: ResolvedTranslationPromptContext, options?: {
    sourceText?: string | null;
    targetLocale?: string | null;
}): PromptContextBlockSelection;
//# sourceMappingURL=promptContextBuilder.d.ts.map