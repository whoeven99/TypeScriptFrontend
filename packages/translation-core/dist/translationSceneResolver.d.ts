export type TranslationPromptProfileId = "catalog_v1" | "seo_v1" | "navigation_v1" | "hero_v1" | "theme_ui_v1" | "editorial_v1" | "structured_content_json_v1" | "config_json_v1" | "transactional_v1" | "slug_v1";
export type TranslationScene = "product_catalog" | "seo_copy" | "navigation_ui" | "marketing_hero" | "announcement_bar" | "footer_info" | "theme_setting_copy" | "editorial_copy" | "app_embedded_copy" | "config_like" | "transactional_template" | "strict_slug";
export type TranslationRole = "heading" | "subheading" | "title" | "description" | "caption" | "button_label" | "menu_label" | "label" | "placeholder" | "body";
export type JsonMode = "structured_content_json" | "config_json";
export type FieldContentClass = "skip" | "html" | "json" | "list" | "plain";
export type TranslationSceneResolution = {
    promptProfileId: TranslationPromptProfileId;
    scene: TranslationScene;
    role: TranslationRole | null;
    module: string | null;
    contentClass: Exclude<FieldContentClass, "skip">;
    jsonMode: JsonMode | null;
};
export declare function resolveTranslationScene(args: {
    module?: string | null;
    key: string;
    contentClass: Exclude<FieldContentClass, "skip">;
    shopifyType?: string | null;
}): TranslationSceneResolution;
//# sourceMappingURL=translationSceneResolver.d.ts.map