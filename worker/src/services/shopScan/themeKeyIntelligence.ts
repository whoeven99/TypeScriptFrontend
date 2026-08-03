import type { ThemeTextSample } from "./translationSamples.js";

export type ThemeScene =
  | "marketing_hero"
  | "navigation_ui"
  | "announcement_bar"
  | "footer_info"
  | "product_supporting_copy"
  | "editorial_copy"
  | "theme_setting_copy"
  | "app_embedded_copy"
  | "config_like";

export type ThemeRole =
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

export type ThemeTonePreference = "adaptive" | "balanced" | "literal";
export type ThemeCreativity = "low" | "medium" | "high";

export type ThemeSceneHint = {
  module: string;
  keyPattern: string;
  namespace: string | null;
  resourcePattern: string | null;
  scene: ThemeScene;
  role: ThemeRole | null;
  tonePreference: ThemeTonePreference;
  creativity: ThemeCreativity;
  confidence: number;
};

export type ThemeSceneProfile = {
  sceneStats: Array<{ scene: ThemeScene; count: number }>;
  roleStats: Array<{ role: ThemeRole; count: number }>;
  sceneHints: ThemeSceneHint[];
  appNamespaces: string[];
  highConfidencePatterns: string[];
};

const HERO_RE = /hero|banner|slideshow|featured|cover|spotlight/i;
const ANNOUNCEMENT_RE = /announcement|promo_bar|topbar|notice/i;
const NAV_RE = /menu|navigation|nav|header/i;
const FOOTER_RE = /footer|newsletter/i;
const PRODUCT_SUPPORT_RE = /product|collection|featured_product|featured_collection/i;
const EDITORIAL_RE = /faq|accordion|collapsible|story|about|richtext|testimonial|review/i;
const SETTINGS_RE = /label|placeholder|hint|help|setting|settings|option/i;
const CONFIG_RE =
  /schema|padding|margin|color|font|size|width|height|spacing|desktop|mobile|tablet|opacity|border|radius|position|align|alignment|style|icon|image|video|url|link|code|css|class|id|layout/i;

const ROLE_PATTERNS: Array<{ role: ThemeRole; re: RegExp }> = [
  { role: "button_label", re: /button_label|button-text|cta|shop_now|buy_now|link_label/i },
  { role: "subheading", re: /subheading|subtitle|tagline|slogan|eyebrow/i },
  { role: "heading", re: /heading|headline/i },
  { role: "title", re: /title/i },
  { role: "description", re: /description|desc|summary|text_content/i },
  { role: "caption", re: /caption/i },
  { role: "menu_label", re: /menu.*label|nav.*label|navigation.*label/i },
  { role: "placeholder", re: /placeholder/i },
  { role: "label", re: /label/i },
  { role: "body", re: /body|content|text|copy/i },
];

const APP_NAMESPACE_RE =
  /pagefly|gempage|judge\.?me|loox|bundle|popup|upsell|cross_sell|review|ecom|beae/i;

const MAX_SCENE_HINTS = 60;
const MAX_APP_NAMESPACES = 20;
const MAX_HIGH_CONFIDENCE_PATTERNS = 30;

type ResolvedThemeIntent = {
  namespace: string | null;
  resourcePattern: string | null;
  scene: ThemeScene;
  role: ThemeRole | null;
  tonePreference: ThemeTonePreference;
  creativity: ThemeCreativity;
  confidence: number;
  keyPattern: string;
};

export function buildThemeSceneProfile(
  samples: ThemeTextSample[],
): ThemeSceneProfile | null {
  if (samples.length === 0) return null;

  const sceneCounts = new Map<ThemeScene, number>();
  const roleCounts = new Map<ThemeRole, number>();
  const namespaceCounts = new Map<string, number>();
  const hintMap = new Map<string, ThemeSceneHint>();
  const highConfidencePatterns = new Set<string>();

  for (const sample of samples) {
    const intent = resolveThemeIntent(sample);
    bump(sceneCounts, intent.scene);
    if (intent.role) bump(roleCounts, intent.role);
    if (intent.namespace) bump(namespaceCounts, intent.namespace);

    const hintKey = [
      sample.module,
      intent.keyPattern,
      intent.namespace ?? "",
      intent.scene,
      intent.role ?? "",
    ].join("\u0000");
    const existing = hintMap.get(hintKey);
    if (!existing || intent.confidence > existing.confidence) {
      hintMap.set(hintKey, {
        module: sample.module,
        keyPattern: intent.keyPattern,
        namespace: intent.namespace,
        resourcePattern: intent.resourcePattern,
        scene: intent.scene,
        role: intent.role,
        tonePreference: intent.tonePreference,
        creativity: intent.creativity,
        confidence: intent.confidence,
      });
    }

    if (intent.confidence >= 0.9) {
      highConfidencePatterns.add(intent.keyPattern);
    }
  }

  const sceneStats = [...sceneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([scene, count]) => ({ scene, count }));

  const roleStats = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({ role, count }));

  const appNamespaces = [...namespaceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_APP_NAMESPACES)
    .map(([namespace]) => namespace);

  const sceneHints = [...hintMap.values()]
    .sort((a, b) => b.confidence - a.confidence || a.keyPattern.localeCompare(b.keyPattern))
    .slice(0, MAX_SCENE_HINTS);

  return {
    sceneStats,
    roleStats,
    sceneHints,
    appNamespaces,
    highConfidencePatterns: [...highConfidencePatterns]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_HIGH_CONFIDENCE_PATTERNS),
  };
}

function resolveThemeIntent(sample: ThemeTextSample): ResolvedThemeIntent {
  const keyBlob = `${sample.key} ${sample.resourceId}`.toLowerCase();
  const namespace = extractAppNamespace(keyBlob);
  const resourcePattern = normalizeResourcePattern(sample.resourceId);
  const role = resolveRole(keyBlob);

  let scene: ThemeScene;
  let tonePreference: ThemeTonePreference;
  let creativity: ThemeCreativity;
  let confidence: number;

  if (namespace) {
    scene = "app_embedded_copy";
    tonePreference = "balanced";
    creativity = "low";
    confidence = 0.95;
  } else if (ANNOUNCEMENT_RE.test(keyBlob)) {
    scene = "announcement_bar";
    tonePreference = "adaptive";
    creativity = "medium";
    confidence = 0.95;
  } else if (HERO_RE.test(keyBlob)) {
    scene = "marketing_hero";
    tonePreference = "adaptive";
    creativity = role === "button_label" ? "medium" : "high";
    confidence = 0.94;
  } else if (NAV_RE.test(keyBlob)) {
    scene = "navigation_ui";
    tonePreference = "balanced";
    creativity = "low";
    confidence = 0.92;
  } else if (FOOTER_RE.test(keyBlob)) {
    scene = "footer_info";
    tonePreference = "balanced";
    creativity = "low";
    confidence = 0.88;
  } else if (CONFIG_RE.test(keyBlob) && role === null) {
    scene = "config_like";
    tonePreference = "literal";
    creativity = "low";
    confidence = 0.93;
  } else if (SETTINGS_RE.test(keyBlob)) {
    scene = "theme_setting_copy";
    tonePreference = "literal";
    creativity = "low";
    confidence = 0.86;
  } else if (EDITORIAL_RE.test(keyBlob)) {
    scene = "editorial_copy";
    tonePreference = "balanced";
    creativity = "medium";
    confidence = 0.82;
  } else if (PRODUCT_SUPPORT_RE.test(keyBlob)) {
    scene = "product_supporting_copy";
    tonePreference = "balanced";
    creativity = "medium";
    confidence = 0.8;
  } else {
    scene = role === "button_label" ? "marketing_hero" : "theme_setting_copy";
    tonePreference = role === "button_label" ? "adaptive" : "balanced";
    creativity = role === "button_label" ? "medium" : "low";
    confidence = role ? 0.72 : 0.55;
  }

  return {
    namespace,
    resourcePattern,
    scene,
    role,
    tonePreference,
    creativity,
    confidence,
    keyPattern: normalizeKeyPattern(sample.key),
  };
}

function resolveRole(keyBlob: string): ThemeRole | null {
  for (const candidate of ROLE_PATTERNS) {
    if (candidate.re.test(keyBlob)) return candidate.role;
  }
  return null;
}

function extractAppNamespace(keyBlob: string): string | null {
  const match = keyBlob.match(APP_NAMESPACE_RE);
  if (!match?.[0]) return null;
  return match[0].replace(/\.+/g, ".").trim();
}

function normalizeKeyPattern(key: string): string {
  return key
    .toLowerCase()
    .replace(/\[\d+\]/g, "[*]")
    .replace(/\d+/g, "*")
    .replace(/:{2,}/g, ":")
    .trim();
}

function normalizeResourcePattern(resourceId: string): string | null {
  const normalized = (resourceId ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return normalized.replace(/\d+/g, "*");
}

function bump<T>(map: Map<T, number>, key: T): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}
