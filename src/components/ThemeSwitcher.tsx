// Path: src/components/ThemeSwitcher.tsx
"use client";

import { useTheme, DARK_THEMES, LIGHT_THEMES } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

export function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const { locale } = useI18n();

  const allThemes = [...DARK_THEMES, ...LIGHT_THEMES];

  if (collapsed) {
    // In collapsed sidebar, show only current + a few swatches
    return (
      <div className="flex flex-col items-center gap-1 pt-1.5 pb-0.5">
        {allThemes.slice(0, 6).map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-label={`${theme === t.id ? "Current theme: " : "Switch to "}${t.label.en} theme`}
            aria-pressed={theme === t.id}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
              theme === t.id ? "bg-[var(--brand-muted)]" : "hover:bg-[var(--surface-hover)]"
            )}
            title={t.label.en}
          >
            <span
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200 pointer-events-none",
                theme === t.id
                  ? "ring-2 ring-[var(--text-default)]/20 ring-offset-1 ring-offset-[var(--surface)] scale-125"
                  : "opacity-35 group-hover:opacity-75"
              )}
              style={{ backgroundColor: t.brandColor }}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-2">
      <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-widest mb-1.5 flex items-center gap-1.5 px-2">
        <Palette size={9} />
        {locale === "th" ? "ธีม" : locale === "ja" ? "テーマ" : "Theme"}
      </p>
      {/* Dark themes row */}
      <div className="grid grid-cols-6 gap-1">
        {DARK_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-label={`${t.label[locale] || t.label.en} theme${theme === t.id ? ", currently selected" : ""}`}
            aria-pressed={theme === t.id}
            title={t.label[locale] || t.label.en}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all duration-200",
              theme === t.id
                ? "bg-[var(--brand-muted)] ring-1 ring-[var(--text-default)]/10"
                : "opacity-45 hover:opacity-90 hover:bg-[var(--surface-hover)]"
            )}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: t.brandColor }}
            />
          </button>
        ))}
      </div>
      {/* Light themes row */}
      <div className="grid grid-cols-4 gap-1">
        {LIGHT_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-label={`${t.label[locale] || t.label.en} theme${theme === t.id ? ", currently selected" : ""}`}
            aria-pressed={theme === t.id}
            title={t.label[locale] || t.label.en}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all duration-200",
              theme === t.id
                ? "bg-[var(--brand-muted)] ring-1 ring-[var(--text-default)]/10"
                : "opacity-45 hover:opacity-90 hover:bg-[var(--surface-hover)]"
            )}
          >
            <div
              className="w-4 h-4 rounded-full border border-[var(--border)]"
              style={{ backgroundColor: t.previewBg }}
            >
              <div className="w-full h-full rounded-full" style={{ background: `radial-gradient(circle at 60% 60%, ${t.brandColor}66, transparent)` }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
