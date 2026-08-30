import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

export const defaultLocale = "en";
export const locales = ["en", "ar"] as const;
export type AppLocale = (typeof locales)[number];
export const localeCookieName = "locale";

function readCookieLocale(): AppLocale {
  if (typeof document === "undefined") {
    return defaultLocale;
  }

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${localeCookieName}=`))
    ?.split("=")[1];

  return value === "ar" || value === "en" ? value : defaultLocale;
}

function applyDocumentLocale(locale: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

const initialLocale = readCookieLocale();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLocale,
  fallbackLng: defaultLocale,
  interpolation: {
    escapeValue: false,
  },
});

applyDocumentLocale(i18n.language);

i18n.on("languageChanged", applyDocumentLocale);

export default i18n;
