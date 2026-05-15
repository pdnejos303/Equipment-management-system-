// Path: src/components/LanguageSwitcher.tsx
"use client";

import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { locale, setLocale } = useI18n();

  const locales: Locale[] = ["th", "en", "ja"];

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        {locales.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            aria-label={`Switch to ${LOCALE_LABELS[l]}`}
            aria-pressed={locale === l}
            className={`w-10 h-10 rounded text-[10px] font-bold transition-all duration-200 ${
              locale === l
                ? "bg-brand-500 text-black"
                : "text-gray-500 hover:text-gray-300 hover:bg-surface-hover"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 px-1 rounded-lg p-0.5 border border-[var(--border)]" style={{ background: "var(--surface-hover)" }}>
      <Globe size={13} className="flex-shrink-0 ml-1 mr-0.5" style={{ color: "var(--text-subtle)" }} />
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-label={`Switch to ${LOCALE_LABELS[l]}`}
          aria-pressed={locale === l}
          className={`px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-200 min-h-[36px] flex items-center justify-center ${
            locale === l
              ? "bg-brand-500 text-black"
              : "hover:bg-[var(--surface-active)]"
          }`}
          style={locale === l ? { boxShadow: "0 0 8px rgb(var(--brand-rgb) / 0.15)" } : { color: "var(--text-subtle)" }}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
