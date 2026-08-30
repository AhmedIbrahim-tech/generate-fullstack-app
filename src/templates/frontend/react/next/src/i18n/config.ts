export const locales = ["en", "ar"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const localeCookieName = "locale";

export function isAppLocale(value: string | undefined): value is AppLocale {
  return value === "en" || value === "ar";
}
