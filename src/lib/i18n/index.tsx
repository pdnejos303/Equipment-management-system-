"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import th from "./locales/th";
import en from "./locales/en";
import ja from "./locales/ja";

export type Locale = "th" | "en" | "ja";

export const LOCALE_LABELS: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
  ja: "日本語",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  th: "🇹🇭",
  en: "🇺🇸",
  ja: "🇯🇵",
};

// Key access helper — supports both nested objects and flat dotted keys.
// At each level we try the remaining path as a single flat key first
// (so `labels["template.full"]` is reachable via `t("labels.template.full")`),
// then fall back to one more step of nested traversal.
function getNestedValue(obj: any, path: string): string {
  const parts = path.split(".");
  const walk = (node: any, idx: number): string | undefined => {
    if (idx >= parts.length) {
      return typeof node === "string" ? node : undefined;
    }
    if (node == null || typeof node !== "object") return undefined;
    const remaining = parts.slice(idx).join(".");
    const flatHit = node[remaining];
    if (typeof flatHit === "string") return flatHit;
    return walk(node[parts[idx]], idx + 1);
  };
  return walk(obj, 0) ?? path;
}

const translations: Record<Locale, Record<string, any>> = { th, en, ja };

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
