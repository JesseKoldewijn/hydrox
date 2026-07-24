import i18n from "i18next";
import en from "./locales/en.json";

export async function initI18n() {
  if (i18n.isInitialized) return i18n;
  await i18n.init({
    lng: navigator.language.startsWith("en") ? "en" : "en",
    fallbackLng: "en",
    resources: {
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export function t(key: string, opts?: Record<string, unknown>) {
  return i18n.t(key, opts);
}
