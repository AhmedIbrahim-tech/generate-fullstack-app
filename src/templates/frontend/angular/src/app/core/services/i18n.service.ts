import { Injectable, computed, signal } from "@angular/core";
import { ar } from "../i18n/messages/ar";
import { en } from "../i18n/messages/en";

const messages = { en, ar } as const;
export type AppLocale = keyof typeof messages;

@Injectable({ providedIn: "root" })
export class I18nService {
  private readonly current = signal<AppLocale>(this.readCookieLocale());

  readonly locale = this.current.asReadonly();
  readonly dir = computed(() => (this.current() === "ar" ? "rtl" : "ltr"));

  constructor() {
    this.applyDocumentLocale(this.current());
  }

  translate(key: string): string {
    const table = messages[this.current()] as Record<string, string>;
    return table[key] ?? key;
  }

  setLocale(locale: AppLocale) {
    this.current.set(locale);
    if (typeof document !== "undefined") {
      document.cookie = `locale=${locale}; path=/; SameSite=Lax`;
    }
    this.applyDocumentLocale(locale);
  }

  private readCookieLocale(): AppLocale {
    if (typeof document === "undefined") {
      return "en";
    }

    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1];
    return value === "ar" ? "ar" : "en";
  }

  private applyDocumentLocale(locale: AppLocale) {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }
}
