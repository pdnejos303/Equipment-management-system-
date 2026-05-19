// Path: src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { th, enUS, ja, zhCN, fr } from "date-fns/locale";
import type { Locale } from "./i18n";

const DATE_LOCALES: Record<Locale, typeof enUS> = { th, en: enUS, ja, zh: zhCN, fr };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, locale: Locale = "th"): string {
  const localeMap: Record<Locale, string> = {
    th: "th-TH", en: "en-US", ja: "ja-JP", zh: "zh-CN", fr: "fr-FR",
  };
  return amount.toLocaleString(localeMap[locale]);
}

export function formatDate(date: Date | string | null | undefined, locale: Locale = "th"): string {
  if (!date) return "-";
  return format(new Date(date), "d MMM yyyy", { locale: DATE_LOCALES[locale] });
}

export const STATUS_CONFIG = {
  ACTIVE: { color: "text-green-400", bg: "bg-green-500/10" },
  AVAILABLE: { color: "text-blue-400", bg: "bg-blue-500/10" },
  MAINTENANCE: { color: "text-amber-400", bg: "bg-amber-500/10" },
  RETIRED: { color: "text-red-400", bg: "bg-red-500/10" },
} as const;

export const CATEGORY_CONFIG = {
  LAPTOP: { emoji: "💻" },
  MONITOR: { emoji: "🖥️" },
  VEHICLE: { emoji: "🚗" },
  FURNITURE: { emoji: "🪑" },
  CAMERA: { emoji: "📷" },
  PROJECTOR: { emoji: "📽️" },
  PRINTER: { emoji: "🖨️" },
  PHONE: { emoji: "📱" },
  OTHER: { emoji: "📦" },
} as const;
