// Path: src/app/(features)/settings/page.tsx
"use client";

import { Globe, Palette, CheckCircle2, Moon, Sun } from "lucide-react";
import { useI18n, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/lib/i18n";
import { useTheme, DARK_THEMES, LIGHT_THEMES, type ThemeInfo } from "@/lib/theme";
import { cn } from "@/lib/utils";

const LOCALE_DESCRIPTIONS: Record<Locale, string> = {
  th: "ภาษาไทย",
  en: "English (US)",
  ja: "日本語",
  zh: "简体中文",
  fr: "Français",
};

function ThemeCard({ th_, isActive, onClick, locale }: {
  th_: ThemeInfo;
  isActive: boolean;
  onClick: () => void;
  locale: Locale;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-300",
        isActive
          ? "border-white/20 bg-surface ring-1 ring-white/5"
          : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      )}
      style={isActive ? { boxShadow: `0 4px 20px ${th_.brandColor}15, 0 0 0 1px ${th_.brandColor}20` } : undefined}
    >
      {/* Preview swatch */}
      <div className="relative">
        <div
          className="w-11 h-11 rounded-full shadow-lg transition-transform duration-200 group-hover:scale-110"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${th_.brandColor}dd, ${th_.brandColor})`,
            boxShadow: isActive
              ? `0 0 20px ${th_.brandColor}44, 0 0 40px ${th_.brandColor}22`
              : `0 2px 8px ${th_.brandColor}22`,
          }}
        />
        {/* Mini background preview */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-surface"
          style={{ backgroundColor: th_.previewBg }}
        />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium" style={{ color: isActive ? th_.brandColor : undefined }}>
          {th_.label[locale] || th_.label.en}
        </p>
        <p className="text-[10px] text-[var(--text-subtle)]">{th_.label.en}</p>
      </div>
      {isActive && (
        <CheckCircle2 size={14} className="absolute top-2 right-2" style={{ color: th_.brandColor }} />
      )}
    </button>
  );
}

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();

  const locales: Locale[] = ["th", "en", "ja", "zh", "fr"];

  return (
    <div className="page-enter">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t("settings.subtitle")}</p>
        </div>

        {/* Language */}
        <div className="card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-brand-500" />
            <h2 className="text-sm font-semibold">{t("settings.language")}</h2>
          </div>
          <div className="space-y-2">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                  locale === l
                    ? "bg-brand-500/10 border-brand-500/30"
                    : "bg-[var(--surface-raised)] border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{LOCALE_FLAGS[l]}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium">{LOCALE_LABELS[l]}</p>
                    <p className="text-xs text-[var(--text-subtle)]">{LOCALE_DESCRIPTIONS[l]}</p>
                  </div>
                </div>
                {locale === l && <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dark Themes */}
        <div className="card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2">
            <Moon size={15} className="text-brand-500" />
            <h2 className="text-sm font-semibold">{t("settings.darkThemes")}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DARK_THEMES.map((th_) => (
              <ThemeCard
                key={th_.id}
                th_={th_}
                isActive={theme === th_.id}
                onClick={() => setTheme(th_.id)}
                locale={locale}
              />
            ))}
          </div>
        </div>

        {/* Light Themes */}
        <div className="card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-2">
            <Sun size={15} className="text-brand-500" />
            <h2 className="text-sm font-semibold">{t("settings.lightThemes")}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LIGHT_THEMES.map((th_) => (
              <ThemeCard
                key={th_.id}
                th_={th_}
                isActive={theme === th_.id}
                onClick={() => setTheme(th_.id)}
                locale={locale}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
