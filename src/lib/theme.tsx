// Path: src/lib/theme.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "obsidian" | "midnight" | "forest" | "amethyst" | "crimson" | "aurora"
  | "snow" | "latte" | "sakura" | "arctic";

export type ThemeMode = "dark" | "light";

export interface ThemeInfo {
  id: Theme;
  mode: ThemeMode;
  label: { th: string; en: string; ja: string };
  brandColor: string;
  previewBg: string;
}

export const THEMES: ThemeInfo[] = [
  // ── Dark themes ──
  { id: "obsidian",  mode: "dark",  label: { th: "อำพัน",      en: "Obsidian",  ja: "オブシディアン" }, brandColor: "#f59e0b", previewBg: "#0a0a0a" },
  { id: "midnight",  mode: "dark",  label: { th: "มิดไนท์",    en: "Midnight",  ja: "ミッドナイト"   }, brandColor: "#60a5fa", previewBg: "#050a14" },
  { id: "forest",    mode: "dark",  label: { th: "มรกต",       en: "Forest",    ja: "フォレスト"     }, brandColor: "#34d399", previewBg: "#040b07" },
  { id: "amethyst",  mode: "dark",  label: { th: "อเมทิสต์",   en: "Amethyst",  ja: "アメジスト"     }, brandColor: "#a78bfa", previewBg: "#08080f" },
  { id: "crimson",   mode: "dark",  label: { th: "ทับทิม",     en: "Crimson",   ja: "クリムゾン"     }, brandColor: "#f87171", previewBg: "#0f0505" },
  { id: "aurora",    mode: "dark",  label: { th: "ออโรร่า",    en: "Aurora",    ja: "オーロラ"       }, brandColor: "#22d3ee", previewBg: "#03090b" },
  // ── Light themes ──
  { id: "snow",      mode: "light", label: { th: "สโนว์",      en: "Snow",      ja: "スノー"         }, brandColor: "#3b82f6", previewBg: "#fafafa" },
  { id: "latte",     mode: "light", label: { th: "ลาเต้",      en: "Latte",     ja: "ラテ"           }, brandColor: "#d97706", previewBg: "#faf8f5" },
  { id: "sakura",    mode: "light", label: { th: "ซากุระ",     en: "Sakura",    ja: "サクラ"         }, brandColor: "#ec4899", previewBg: "#fdf2f8" },
  { id: "arctic",    mode: "light", label: { th: "อาร์กติก",   en: "Arctic",    ja: "アークティック"  }, brandColor: "#0891b2", previewBg: "#f0fdfa" },
];

export const DARK_THEMES = THEMES.filter((t) => t.mode === "dark");
export const LIGHT_THEMES = THEMES.filter((t) => t.mode === "light");

export function getThemeMode(themeId: Theme): ThemeMode {
  return THEMES.find((t) => t.id === themeId)?.mode ?? "dark";
}

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "latte",
  mode: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("latte");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("equip-theme") as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        setThemeState(saved);
        applyTheme(saved);
      } else {
        applyTheme("latte");
      }
    } catch {}
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("equip-theme", t); } catch {}
    applyTheme(t);
  };

  const mode = getThemeMode(theme);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.setAttribute("data-theme", t);
  const m = getThemeMode(t);
  el.setAttribute("data-mode", m);
  // Update color-scheme for native controls
  el.style.colorScheme = m;
}

export function useTheme() {
  return useContext(ThemeContext);
}
