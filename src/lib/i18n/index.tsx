"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import th from "./locales/th";
import en from "./locales/en";
import ja from "./locales/ja";
import zh from "./locales/zh";
import fr from "./locales/fr";

export type Locale = "th" | "en" | "ja" | "zh" | "fr";

export const LOCALE_LABELS: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
  ja: "日本語",
  zh: "中文",
  fr: "Français",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  th: "🇹🇭",
  en: "🇺🇸",
  ja: "🇯🇵",
  zh: "🇨🇳",
  fr: "🇫🇷",
};

// Nested key access helper
function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? path;
}

const translations: Record<Locale, Record<string, any>> = { th, en, ja, zh, fr };

// ── Context ──

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "th",
  setLocale: () => {},
  t: (key) => key,
});

function detectBrowserLocale(): Locale {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const code = lang.toLowerCase();
    if (code.startsWith("th")) return "th";
    if (code.startsWith("ja")) return "ja";
    if (code.startsWith("zh")) return "zh";
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("en")) return "en";
  }
  return "th";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    } else {
      // First visit — auto-detect from browser/OS language
      const detected = detectBrowserLocale();
      setLocaleState(detected);
      localStorage.setItem("locale", detected);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string, ...args: (string | number)[]): string => {
      let text = getNestedValue(translations[locale], key);
      if (text === key) {
        text = getNestedValue(translations["th"], key);
      }
      // Replace {0}, {1}, etc.
      args.forEach((arg, i) => {
        text = text.replace(`{${i}}`, String(arg));
      });
      return text;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
