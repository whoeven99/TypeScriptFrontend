import { APP_I18N_LANGUAGE_CODES } from "./appI18nLanguages";

const SUPPORTED = new Set(APP_I18N_LANGUAGE_CODES);

/** Map browser / Accept-Language header to a supported app UI locale code. */
export function resolveAppI18nCode(
  acceptLanguageHeader: string | null | undefined,
): string {
  const raw = acceptLanguageHeader?.split(",")[0]?.trim() || "en";
  if (SUPPORTED.has(raw)) return raw;

  const base = raw.split("-")[0];
  if (!base) return "en";

  if (base === "zh") {
    if (raw === "zh-TW" || raw === "zh-HK" || raw === "zh-MO") return "zh-TW";
    return "zh-CN";
  }

  const byBase = APP_I18N_LANGUAGE_CODES.find(
    (code) => code === base || code.startsWith(`${base}-`),
  );
  if (byBase) return byBase;

  return "en";
}
