// Path: src/components/LanguageSwitcher.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/lib/i18n";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALES: Locale[] = ["th", "en", "ja", "zh", "fr"];

export function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [open]);

  const pick = (l: Locale) => {
    setLocale(l);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border transition-colors min-h-[36px]",
          collapsed ? "px-2 py-1.5" : "px-2.5 py-2",
          "hover:bg-[var(--surface-active)]"
        )}
        style={{
          background: "var(--surface-hover)",
          borderColor: "var(--border)",
          color: "var(--text-default)",
        }}
      >
        <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        {!collapsed && (
          <span className="text-xs font-medium">{LOCALE_LABELS[locale]}</span>
        )}
        <ChevronDown
          size={13}
          className={cn("transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1.5 min-w-[160px] rounded-lg border shadow-xl overflow-hidden z-50 animate-fade-in"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={locale === l}>
              <button
                type="button"
                onClick={() => pick(l)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                  locale === l
                    ? "bg-brand-500/10 text-[var(--text-default)]"
                    : "hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
                )}
              >
                <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                <span className="flex-1">{LOCALE_LABELS[l]}</span>
                {locale === l && <Check size={14} className="text-brand-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
