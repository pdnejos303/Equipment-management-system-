// Path: src/app/(features)/settings/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Palette, CheckCircle2, Moon, Sun, Columns3, RotateCcw, ChevronDown } from "lucide-react";
import { useI18n, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/lib/i18n";
import { useTheme, THEMES, type Theme, type ThemeInfo } from "@/lib/theme";
import { useAssetColumns, ASSET_COLUMNS } from "@/lib/useAssetColumns";
import { cn } from "@/lib/utils";

const LOCALE_DESCRIPTIONS: Record<Locale, string> = {
  th: "ภาษาไทย",
  en: "English (US)",
  ja: "日本語",
  zh: "简体中文",
  fr: "Français",
};

const LOCALES: Locale[] = ["th", "en", "ja", "zh", "fr"];

function ThemeSwatch({ th_, size = 22 }: { th_: ThemeInfo; size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full shadow"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, ${th_.brandColor}dd, ${th_.brandColor})`,
          boxShadow: `0 0 0 1px ${th_.brandColor}30, 0 2px 6px ${th_.brandColor}22`,
        }}
      />
      <div
        className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[var(--surface)]"
        style={{ width: size * 0.42, height: size * 0.42, backgroundColor: th_.previewBg }}
      />
    </div>
  );
}

function LanguageDropdown({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl leading-none flex-shrink-0">{LOCALE_FLAGS[value]}</span>
          <div className="text-left min-w-0">
            <p className="text-sm font-medium truncate">{LOCALE_LABELS[value]}</p>
            <p className="text-[11px] text-[var(--text-subtle)] truncate">{LOCALE_DESCRIPTIONS[value]}</p>
          </div>
        </div>
        <ChevronDown size={16} className={cn("text-[var(--text-subtle)] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden animate-fade-in"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
        >
          {LOCALES.map((l) => {
            const active = l === value;
            return (
              <button
                key={l}
                type="button"
                onClick={() => { onChange(l); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                  active ? "bg-brand-500/10" : "hover:bg-[var(--surface-hover)]"
                )}
              >
                <span className="text-xl leading-none flex-shrink-0">{LOCALE_FLAGS[l]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{LOCALE_LABELS[l]}</p>
                  <p className="text-[11px] text-[var(--text-subtle)] truncate">{LOCALE_DESCRIPTIONS[l]}</p>
                </div>
                {active && <CheckCircle2 size={15} className="text-brand-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeDropdown({ value, onChange, locale, t }: {
  value: Theme;
  onChange: (t: Theme) => void;
  locale: Locale;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = THEMES.find((th_) => th_.id === value) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups: { label: string; icon: typeof Moon; mode: "dark" | "light" }[] = [
    { label: t("settings.darkThemes"), icon: Moon, mode: "dark" },
    { label: t("settings.lightThemes"), icon: Sun, mode: "light" },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ThemeSwatch th_={current} />
          <div className="text-left min-w-0">
            <p className="text-sm font-medium truncate">{current.label[locale] || current.label.en}</p>
            <p className="text-[11px] text-[var(--text-subtle)] truncate capitalize">
              {current.mode === "dark" ? t("settings.darkThemes") : t("settings.lightThemes")} · {current.label.en}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={cn("text-[var(--text-subtle)] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden max-h-[360px] overflow-y-auto animate-fade-in"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
        >
          {groups.map(({ label, icon: Icon, mode }) => (
            <div key={mode}>
              <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-1 sticky top-0 bg-[var(--surface)]">
                <Icon size={11} className="text-[var(--text-subtle)]" />
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">{label}</span>
              </div>
              {THEMES.filter((th_) => th_.mode === mode).map((th_) => {
                const active = th_.id === value;
                return (
                  <button
                    key={th_.id}
                    type="button"
                    onClick={() => { onChange(th_.id); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors",
                      active ? "bg-brand-500/10" : "hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    <ThemeSwatch th_={th_} size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={active ? { color: th_.brandColor } : undefined}>
                        {th_.label[locale] || th_.label.en}
                      </p>
                      <p className="text-[11px] text-[var(--text-subtle)] truncate">{th_.label.en}</p>
                    </div>
                    {active && <CheckCircle2 size={15} className="flex-shrink-0" style={{ color: th_.brandColor }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { columns, toggle, reset } = useAssetColumns();

  return (
    <div className="page-enter">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t("settings.subtitle")}</p>
        </div>

        {/* Language + Theme — compact dropdowns */}
        <div className="card p-5 animate-fade-in space-y-4 relative z-20" style={{ animationDelay: "0.05s" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-brand-500" />
              <h2 className="text-sm font-semibold">{t("settings.language")}</h2>
            </div>
            <LanguageDropdown value={locale} onChange={setLocale} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette size={14} className="text-brand-500" />
              <h2 className="text-sm font-semibold">{t("settings.theme")}</h2>
            </div>
            <ThemeDropdown value={theme} onChange={setTheme} locale={locale} t={t} />
          </div>
        </div>

        {/* Asset Columns */}
        <div className="card p-6 space-y-4 animate-fade-in relative z-10" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Columns3 size={15} className="text-brand-500" />
              <div>
                <h2 className="text-sm font-semibold">{t("settings.assetColumns")}</h2>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">{t("settings.assetColumnsSubtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="btn-ghost text-xs flex items-center gap-1.5 !py-1.5 !px-2.5"
            >
              <RotateCcw size={12} />
              {t("settings.assetColumnsReset")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ASSET_COLUMNS.map(({ key, required }) => {
              const checked = columns[key];
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border transition-all",
                    required
                      ? "border-[var(--border)] bg-[var(--surface-raised)] cursor-not-allowed opacity-70"
                      : checked
                        ? "border-brand-500/30 bg-brand-500/5 cursor-pointer hover:border-brand-500/40"
                        : "border-[var(--border)] bg-[var(--surface-raised)] cursor-pointer hover:border-[var(--border-strong)]"
                  )}
                >
                  <span className="text-sm font-medium">{t(`settings.col_${key}`)}</span>
                  <div className="flex items-center gap-2">
                    {required && (
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
                        {t("settings.assetColumnsRequired")}
                      </span>
                    )}
                    <span
                      role="switch"
                      aria-checked={checked}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        checked ? "bg-brand-500" : "bg-[var(--surface-active)]"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                          checked ? "translate-x-[18px]" : "translate-x-0.5"
                        )}
                      />
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={required}
                      onChange={() => toggle(key)}
                      className="sr-only"
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
