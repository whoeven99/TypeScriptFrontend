export type TranslationPromptProfileId =
  | "catalog_v1"
  | "seo_v1"
  | "navigation_v1"
  | "hero_v1"
  | "theme_ui_v1"
  | "editorial_v1"
  | "structured_content_json_v1"
  | "config_json_v1"
  | "transactional_v1"
  | "slug_v1";

export type TranslationScene =
  | "product_catalog"
  | "seo_copy"
  | "navigation_ui"
  | "marketing_hero"
  | "announcement_bar"
  | "footer_info"
  | "theme_setting_copy"
  | "editorial_copy"
  | "app_embedded_copy"
  | "config_like"
  | "transactional_template"
  | "strict_slug";

export type TranslationRole =
  | "heading"
  | "subheading"
  | "title"
  | "description"
  | "caption"
  | "button_label"
  | "menu_label"
  | "label"
  | "placeholder"
  | "body";

export type JsonMode = "structured_content_json" | "config_json";
export type FieldContentClass = "skip" | "html" | "json" | "list" | "plain";
export type TranslationFieldKind =
  | "title"
  | "description"
  | "body"
  | "seo_title"
  | "seo_description"
  | "handle"
  | "ui_label"
  | "unknown";
export type TranslationAudience = "shopper" | "merchant" | "system";
export type TranslationRewriteFreedom = "strict" | "balanced" | "adaptive";

export type TranslationSceneResolution = {
  promptProfileId: TranslationPromptProfileId;
  scene: TranslationScene;
  role: TranslationRole | null;
  module: string | null;
  contentClass: Exclude<FieldContentClass, "skip">;
  jsonMode: JsonMode | null;
  fieldKind: TranslationFieldKind;
  audience: TranslationAudience;
  rewriteFreedom: TranslationRewriteFreedom;
};

const THEME_MODULE_RE = /^ONLINE_STORE_THEME_/i;
const CATALOG_MODULE_RE =
  /^(PRODUCT|COLLECTION|PRODUCT_OPTION|PRODUCT_OPTION_VALUE|FILTER|METAOBJECT|METAFIELD)$/i;
const NAVIGATION_MODULE_RE = /^(MENU|LINK)$/i;
const EDITORIAL_MODULE_RE = /^(ARTICLE|BLOG|PAGE)$/i;
const TRANSACTIONAL_MODULE_RE =
  /^(EMAIL_TEMPLATE|PACKING_SLIP_TEMPLATE|SHOP_POLICY|DELIVERY_METHOD_DEFINITION)$/i;

const HERO_RE = /hero|banner|slideshow|featured|cover|spotlight/i;
const ANNOUNCEMENT_RE = /announcement|promo_bar|topbar|notice/i;
const NAV_RE = /menu|navigation|nav|header/i;
const FOOTER_RE = /footer|newsletter/i;
const SETTINGS_RE = /label|placeholder|hint|help|setting|settings|option/i;
const CONFIG_RE =
  /schema|padding|margin|color|font|size|width|height|spacing|desktop|mobile|tablet|opacity|border|radius|position|align|alignment|style|icon|image|video|url|link|code|css|class|id|layout/i;
const STRUCTURED_JSON_RE =
  /review|reviews|testimonial|faq|accordion|tabs|richtext|rich_text|caption|heading|subheading|description|body|content|text|message|title|subtitle|quote/i;
const APP_NAMESPACE_RE =
  /pagefly|gempage|judge\.?me|loox|bundle|popup|upsell|cross_sell|review|ecom|beae/i;

const ROLE_PATTERNS: Array<{ role: TranslationRole; re: RegExp }> = [
  { role: "button_label", re: /button_label|button-text|cta|shop_now|buy_now|link_label/i },
  { role: "subheading", re: /subheading|subtitle|tagline|slogan|eyebrow/i },
  { role: "heading", re: /heading|headline/i },
  { role: "title", re: /title/i },
  { role: "description", re: /description|desc|summary|meta_description/i },
  { role: "caption", re: /caption/i },
  { role: "menu_label", re: /menu.*label|nav.*label|navigation.*label/i },
  { role: "placeholder", re: /placeholder/i },
  { role: "label", re: /label/i },
  { role: "body", re: /body|content|text|copy|html/i },
];

export function resolveTranslationScene(args: {
  module?: string | null;
  key: string;
  contentClass: Exclude<FieldContentClass, "skip">;
  shopifyType?: string | null;
}): TranslationSceneResolution {
  const module = normalizeModule(args.module);
  const key = (args.key ?? "").trim();
  const keyBlob = `${module ?? ""} ${key} ${args.shopifyType ?? ""}`.toLowerCase();
  const role = resolveRole(keyBlob);

  if (key.trim().toLowerCase() === "handle") {
    return finalizeTranslationSceneResolution({
      promptProfileId: "slug_v1",
      scene: "strict_slug",
      role,
      module,
      contentClass: args.contentClass,
      jsonMode: null,
    });
  }

  if (isSeoMetaKey(key)) {
    return finalizeTranslationSceneResolution({
      promptProfileId: "seo_v1",
      scene: "seo_copy",
      role: role ?? (key.toLowerCase() === "meta_description" ? "description" : "title"),
      module,
      contentClass: args.contentClass,
      jsonMode: null,
    });
  }

  if (args.contentClass === "json") {
    const jsonMode = resolveJsonMode(module, keyBlob);
    return finalizeTranslationSceneResolution({
      promptProfileId:
        jsonMode === "structured_content_json"
          ? "structured_content_json_v1"
          : "config_json_v1",
      scene:
        jsonMode === "structured_content_json"
          ? resolveStructuredJsonScene(module, keyBlob)
          : "config_like",
      role,
      module,
      contentClass: args.contentClass,
      jsonMode,
    });
  }

  if (isThemeModule(module)) {
    if (ANNOUNCEMENT_RE.test(keyBlob)) {
      return withResolved(args.contentClass, module, "hero_v1", "announcement_bar", role, null);
    }
    if (HERO_RE.test(keyBlob) || role === "button_label" || role === "subheading") {
      return withResolved(args.contentClass, module, "hero_v1", "marketing_hero", role, null);
    }
    if (NAV_RE.test(keyBlob) || role === "menu_label") {
      return withResolved(args.contentClass, module, "navigation_v1", "navigation_ui", role, null);
    }
    if (FOOTER_RE.test(keyBlob)) {
      return withResolved(args.contentClass, module, "navigation_v1", "footer_info", role, null);
    }
    if (APP_NAMESPACE_RE.test(keyBlob)) {
      return withResolved(args.contentClass, module, "theme_ui_v1", "app_embedded_copy", role, null);
    }
    if (CONFIG_RE.test(keyBlob) && role === null) {
      return withResolved(args.contentClass, module, "config_json_v1", "config_like", role, "config_json");
    }
    if (args.contentClass === "html") {
      return withResolved(args.contentClass, module, "editorial_v1", "editorial_copy", role, null);
    }
    return withResolved(args.contentClass, module, "theme_ui_v1", "theme_setting_copy", role, null);
  }

  if (isNavigationModule(module)) {
    return withResolved(args.contentClass, module, "navigation_v1", "navigation_ui", role, null);
  }

  if (isTransactionalModule(module)) {
    return withResolved(
      args.contentClass,
      module,
      "transactional_v1",
      "transactional_template",
      role,
      null,
    );
  }

  if (isEditorialModule(module)) {
    if (args.contentClass === "html") {
      return withResolved(args.contentClass, module, "editorial_v1", "editorial_copy", role, null);
    }
    return withResolved(args.contentClass, module, "catalog_v1", "product_catalog", role, null);
  }

  if (isCatalogModule(module)) {
    return withResolved(args.contentClass, module, "catalog_v1", "product_catalog", role, null);
  }

  if (args.contentClass === "html" || args.contentClass === "list") {
    return withResolved(args.contentClass, module, "editorial_v1", "editorial_copy", role, null);
  }

  return withResolved(args.contentClass, module, "catalog_v1", "product_catalog", role, null);
}

function withResolved(
  contentClass: Exclude<FieldContentClass, "skip">,
  module: string | null,
  promptProfileId: TranslationPromptProfileId,
  scene: TranslationScene,
  role: TranslationRole | null,
  jsonMode: JsonMode | null,
): TranslationSceneResolution {
  return finalizeTranslationSceneResolution({
    promptProfileId,
    scene,
    role,
    module,
    contentClass,
    jsonMode,
  });
}

export function finalizeTranslationSceneResolution(base: Omit<
  TranslationSceneResolution,
  "fieldKind" | "audience" | "rewriteFreedom"
>): TranslationSceneResolution {
  return {
    ...base,
    fieldKind: resolveFieldKind(base),
    audience: resolveAudience(base.scene),
    rewriteFreedom: resolveRewriteFreedom(base.scene, base.role, base.contentClass),
  };
}

function normalizeModule(module: string | null | undefined): string | null {
  const normalized = (module ?? "").trim();
  return normalized ? normalized.toUpperCase() : null;
}

function resolveRole(keyBlob: string): TranslationRole | null {
  for (const candidate of ROLE_PATTERNS) {
    if (candidate.re.test(keyBlob)) return candidate.role;
  }
  return null;
}

function isSeoMetaKey(key: string): boolean {
  const value = key.trim().toLowerCase();
  return value === "meta_title" || value === "meta_description";
}

function resolveJsonMode(module: string | null, keyBlob: string): JsonMode {
  if (CONFIG_RE.test(keyBlob) && !STRUCTURED_JSON_RE.test(keyBlob)) return "config_json";
  if (APP_NAMESPACE_RE.test(keyBlob) && !STRUCTURED_JSON_RE.test(keyBlob)) return "config_json";
  if (isThemeModule(module) && SETTINGS_RE.test(keyBlob) && !STRUCTURED_JSON_RE.test(keyBlob)) {
    return "config_json";
  }
  if (STRUCTURED_JSON_RE.test(keyBlob)) return "structured_content_json";
  return "config_json";
}

function resolveStructuredJsonScene(module: string | null, keyBlob: string): TranslationScene {
  if (isThemeModule(module)) {
    if (HERO_RE.test(keyBlob) || ANNOUNCEMENT_RE.test(keyBlob)) return "marketing_hero";
    if (NAV_RE.test(keyBlob) || FOOTER_RE.test(keyBlob)) return "navigation_ui";
    if (APP_NAMESPACE_RE.test(keyBlob)) return "app_embedded_copy";
    return "theme_setting_copy";
  }
  if (isEditorialModule(module)) return "editorial_copy";
  if (isNavigationModule(module)) return "navigation_ui";
  if (isCatalogModule(module)) return "product_catalog";
  return APP_NAMESPACE_RE.test(keyBlob) ? "app_embedded_copy" : "editorial_copy";
}

function isThemeModule(module: string | null): boolean {
  return Boolean(module && THEME_MODULE_RE.test(module));
}

function isCatalogModule(module: string | null): boolean {
  return Boolean(module && CATALOG_MODULE_RE.test(module));
}

function isNavigationModule(module: string | null): boolean {
  return Boolean(module && NAVIGATION_MODULE_RE.test(module));
}

function isEditorialModule(module: string | null): boolean {
  return Boolean(module && EDITORIAL_MODULE_RE.test(module));
}

function isTransactionalModule(module: string | null): boolean {
  return Boolean(module && TRANSACTIONAL_MODULE_RE.test(module));
}

function resolveFieldKind(
  base: Pick<TranslationSceneResolution, "scene" | "role">,
): TranslationFieldKind {
  if (base.scene === "strict_slug") return "handle";
  if (base.scene === "seo_copy") {
    return base.role === "description" ? "seo_description" : "seo_title";
  }
  if (base.role === "title" || base.role === "heading" || base.role === "subheading") {
    return "title";
  }
  if (base.role === "description") return "description";
  if (base.role === "body" || base.role === "caption") return "body";
  if (
    base.role === "button_label" ||
    base.role === "menu_label" ||
    base.role === "label" ||
    base.role === "placeholder"
  ) {
    return "ui_label";
  }
  return "unknown";
}

function resolveAudience(scene: TranslationScene): TranslationAudience {
  switch (scene) {
    case "theme_setting_copy":
    case "config_like":
      return "merchant";
    case "strict_slug":
      return "system";
    default:
      return "shopper";
  }
}

function resolveRewriteFreedom(
  scene: TranslationScene,
  role: TranslationRole | null,
  contentClass: Exclude<FieldContentClass, "skip">,
): TranslationRewriteFreedom {
  if (scene === "strict_slug" || scene === "config_like" || scene === "transactional_template") {
    return "strict";
  }
  if (
    scene === "marketing_hero" ||
    scene === "announcement_bar" ||
    scene === "editorial_copy" ||
    scene === "seo_copy"
  ) {
    return "adaptive";
  }
  if (
    role === "button_label" ||
    role === "menu_label" ||
    role === "label" ||
    role === "placeholder"
  ) {
    return "strict";
  }
  if (contentClass === "html" || contentClass === "list") return "balanced";
  return "balanced";
}
