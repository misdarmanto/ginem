import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/locales/en.json";
import id from "@/i18n/locales/id.json";

export const LANGUAGE_STORAGE_KEY = "appLanguage";

const savedLanguage = (() => {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === "en" || value === "id" ? value : null;
  } catch {
    return null;
  }
})();

// English is the default language; a saved user preference (via the
// language switcher) is the only thing that overrides it.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
  },
  lng: savedLanguage ?? "en",
  fallbackLng: "en",
  supportedLngs: ["en", "id"],
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(language: "en" | "id") {
  i18n.changeLanguage(language);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

export default i18n;
