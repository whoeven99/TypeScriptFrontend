/** Admin embedded app UI i18n languages (react-i18next / public/locales). */
export type AppI18nLanguage = {
  code: string;
  label: string;
};

export const APP_I18N_LANGUAGES: AppI18nLanguage[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ja", label: "Japanese" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "pt", label: "Portuguese (Portugal)" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "it", label: "Italian" },
  { code: "uk", label: "Ukrainian" },
  { code: "ru", label: "Russian" },
  { code: "ko", label: "Korean" },
  { code: "tr", label: "Turkish" },
];

export const APP_I18N_LANGUAGE_CODES = APP_I18N_LANGUAGES.map(
  (language) => language.code,
);
