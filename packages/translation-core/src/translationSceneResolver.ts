export type FieldContentClass = "html" | "liquid_html" | "json" | "list" | "plain";

export type TranslationPromptProfileId =
  | "catalog_v1"
  | "seo_v1"
  | "navigation_v1"
  | "theme_ui_v1"
  | "editorial_v1"
  | "structured_content_v1"
  | "transactional_v1"
  | "slug_v1";

export type TranslationScene =
  | "product_catalog"
  | "seo_copy"
  | "navigation_ui"
  | "theme_setting_copy"
  | "editorial_copy"
  | "structured_content"
  | "transactional_template"
  | "strict_slug";

export type TranslationRole =
  | "heading"
  | "title"
  | "description"
  | "button_label"
  | "menu_label"
  | "label"
  | "body";

export type TranslationAudience = "shopper" | "merchant" | "system";
export type TranslationRewriteFreedom = "strict" | "balanced" | "adaptive";

export type TranslationSceneResolution = {
  promptProfileId: TranslationPromptProfileId;
  scene: TranslationScene;
  role: TranslationRole | null;
  module: string | null;
  contentClass: FieldContentClass;
  fieldKind:
    | "title"
    | "description"
    | "body"
    | "seo_title"
    | "seo_description"
    | "handle"
    | "ui_label"
    | "unknown";
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

const ROLE_PATTERNS: Array<{ role: TranslationRole; re: RegExp }> = [
  { role: "button_label", re: /button_label|button-text|cta|shop_now|buy_now|link_label/i },
  { role: "heading", re: /heading|headline|title/i },
  { role: "description", re: /description|desc|summary|meta_description/i },
  { role: "menu_label", re: /menu.*label|nav.*label|navigation.*label/i },
  { role: "label", re: /label|placeholder|hint|help/i },
  { role: "body", re: /body|content|text|copy|html/i },
];

export function resolveTranslationScene(args: {
  module?: string | null;
  key: string;
  contentClass: FieldContentClass;
  shopifyType?: string | null;
}): TranslationSceneResolution {
  const module = normalizeModule(args.module ?? args.shopifyType);
  const key = (args.key ?? "").trim();
  const keyBlob = `${module ?? ""} ${key}`.toLowerCase();
  const fieldKind = resolveFieldKind(key);
  const role = resolveRole(keyBlob, fieldKind);

  if (fieldKind === "handle") {
    return finalizeTranslationSceneResolution({
      promptProfileId: "slug_v1",
      scene: "strict_slug",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (fieldKind === "seo_title" || fieldKind === "seo_description") {
    return finalizeTranslationSceneResolution({
      promptProfileId: "seo_v1",
      scene: "seo_copy",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (args.contentClass === "json" || args.contentClass === "list") {
    return finalizeTranslationSceneResolution({
      promptProfileId: "structured_content_v1",
      scene: "structured_content",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (isNavigationModule(module)) {
    return finalizeTranslationSceneResolution({
      promptProfileId: "navigation_v1",
      scene: "navigation_ui",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (isTransactionalModule(module)) {
    return finalizeTranslationSceneResolution({
      promptProfileId: "transactional_v1",
      scene: "transactional_template",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (isThemeModule(module)) {
    return finalizeTranslationSceneResolution({
      promptProfileId: "theme_ui_v1",
      scene: "theme_setting_copy",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (isEditorialModule(module) || args.contentClass === "html" || args.contentClass === "liquid_html") {
    return finalizeTranslationSceneResolution({
      promptProfileId: "editorial_v1",
      scene: "editorial_copy",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  if (isCatalogModule(module)) {
    return finalizeTranslationSceneResolution({
      promptProfileId: "catalog_v1",
      scene: "product_catalog",
      role,
      module,
      contentClass: args.contentClass,
      fieldKind,
    });
  }

  return finalizeTranslationSceneResolution({
    promptProfileId: "catalog_v1",
    scene: "product_catalog",
    role,
    module,
    contentClass: args.contentClass,
    fieldKind,
  });
}

export function finalizeTranslationSceneResolution(
  base: Omit<TranslationSceneResolution, "audience" | "rewriteFreedom">,
): TranslationSceneResolution {
  return {
    ...base,
    audience: resolveAudience(base.scene),
    rewriteFreedom: resolveRewriteFreedom(base.scene, base.role, base.contentClass),
  };
}

function normalizeModule(module: string | null | undefined): string | null {
  const normalized = (module ?? "").trim();
  return normalized ? normalized.toUpperCase() : null;
}

function resolveFieldKind(
  key: string,
):
  | "title"
  | "description"
  | "body"
  | "seo_title"
  | "seo_description"
  | "handle"
  | "ui_label"
  | "unknown" {
  const value = key.trim().toLowerCase();
  if (value === "handle") return "handle";
  if (value === "meta_title") return "seo_title";
  if (value === "meta_description") return "seo_description";
  if (value === "title") return "title";
  if (value.includes("description") || value === "summary") return "description";
  if (/label|placeholder|hint|help|button|cta/.test(value)) return "ui_label";
  if (/body|content|html|text/.test(value)) return "body";
  return "unknown";
}

function resolveRole(
  keyBlob: string,
  fieldKind: TranslationSceneResolution["fieldKind"],
): TranslationRole | null {
  for (const candidate of ROLE_PATTERNS) {
    if (candidate.re.test(keyBlob)) return candidate.role;
  }
  if (fieldKind === "title" || fieldKind === "seo_title") return "title";
  if (fieldKind === "description" || fieldKind === "seo_description") return "description";
  if (fieldKind === "ui_label") return "label";
  if (fieldKind === "body") return "body";
  return null;
}

function isThemeModule(module: string | null): boolean {
  return module != null && THEME_MODULE_RE.test(module);
}

function isCatalogModule(module: string | null): boolean {
  return module != null && CATALOG_MODULE_RE.test(module);
}

function isNavigationModule(module: string | null): boolean {
  return module != null && NAVIGATION_MODULE_RE.test(module);
}

function isEditorialModule(module: string | null): boolean {
  return module != null && EDITORIAL_MODULE_RE.test(module);
}

function isTransactionalModule(module: string | null): boolean {
  return module != null && TRANSACTIONAL_MODULE_RE.test(module);
}

function resolveAudience(scene: TranslationScene): TranslationAudience {
  if (scene === "theme_setting_copy" || scene === "navigation_ui") return "merchant";
  if (scene === "strict_slug") return "system";
  return "shopper";
}

function resolveRewriteFreedom(
  scene: TranslationScene,
  role: TranslationRole | null,
  contentClass: FieldContentClass,
): TranslationRewriteFreedom {
  if (scene === "strict_slug") return "strict";
  if (scene === "navigation_ui" || role === "menu_label" || role === "button_label") {
    return "balanced";
  }
  if (contentClass === "json" || contentClass === "list") return "balanced";
  return "adaptive";
}
