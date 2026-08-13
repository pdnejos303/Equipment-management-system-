// Path: src/lib/theme.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "obsidian" | "midnight" | "forest" | "amethyst" | "crimson" | "aurora"
  | "snow" | "latte" | "sakura" | "arctic";

export type ThemeMode = "dark" | "light";
export type ShapeMode = "rounded" | "square";

export interface ThemeInfo {
  id: Theme;
  mode: ThemeMode;
  label: Record<string, string> & { en: string };
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
  shape: ShapeMode;
  setTheme: (t: Theme) => void;
  setShape: (s: ShapeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "snow",
  mode: "light",
  shape: "square",
  setTheme: () => {},
  setShape: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("snow");
  const [shape, setShapeState] = useState<ShapeMode>("square");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("equip-theme-v2") as Theme | null;
      if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme("snow");
      }

      const savedShape = localStorage.getItem("equip-shape-v2") as ShapeMode | null;
      if (savedShape === "square" || savedShape === "rounded") {
        setShapeState(savedShape);
        applyShape(savedShape);
      } else {
        applyShape("square");
      }
    } catch {}
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("equip-theme-v2", t); } catch {}
    applyTheme(t);
  };

  const setShape = (s: ShapeMode) => {
    setShapeState(s);
    try { localStorage.setItem("equip-shape-v2", s); } catch {}
    applyShape(s);
  };

  const mode = getThemeMode(theme);

  return (
    <ThemeContext.Provider value={{ theme, mode, shape, setTheme, setShape }}>
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

function applyShape(s: ShapeMode) {
  document.documentElement.setAttribute("data-shape", s);
}

export function useTheme() {
  return useContext(ThemeContext);
}

