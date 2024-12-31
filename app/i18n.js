export default {
  // This is the list of languages your application supports
  supportedLngs: ["en", "fr", "de", "es", "it", "nl", "pt", "sv", "ja", "zh", "zh-TW"],
  // This is the language you want to use in case
  // if the user language is not in the supportedLngs
  debug: true,
  interpolation: {
    escapeValue: false,
  },

  fallbackLng: "en",
  // The default namespace of i18next is "translation", but you can customize it here
  // defaultNS: "common",
};
