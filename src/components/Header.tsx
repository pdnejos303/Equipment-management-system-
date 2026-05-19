// Path: src/components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Settings, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const PAGE_TITLES: Record<string, { th: string; en: string; ja: string }> = {
  "/overview":    { th: "ภาพรวม",       en: "Overview",    ja: "概要" },
  "/assets":      { th: "อุปกรณ์",      en: "Assets",      ja: "機器" },
  "/scan":        { th: "สแกน QR",      en: "Scan QR",     ja: "QRスキャン" },
  "/assignments": { th: "การมอบหมาย",   en: "Assignments", ja: "割り当て" },
  "/maintenance": { th: "ซ่อมบำรุง",    en: "Maintenance", ja: "メンテナンス" },
  "/alerts":      { th: "การแจ้งเตือน", en: "Alerts",      ja: "アラート" },
  "/bookings":    { th: "การจอง",       en: "Bookings",    ja: "予約" },
  "/calendar":    { th: "ปฏิทิน",       en: "Calendar",    ja: "カレンダー" },
  "/reports":     { th: "รายงาน",       en: "Reports",     ja: "レポート" },
  "/users":       { th: "ผู้ใช้งาน",    en: "Users",       ja: "ユーザー" },
  "/migrate":     { th: "นำเข้าข้อมูล", en: "Migrate",     ja: "データ移行" },
  "/profile":     { th: "โปรไฟล์",      en: "Profile",     ja: "プロフィール" },
  "/settings":    { th: "การตั้งค่า",   en: "Settings",    ja: "設定" },
};

interface HeaderProps {
  onOpenMobile: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getTitle = () => {
    for (const [path, titles] of Object.entries(PAGE_TITLES)) {
      if (pathname === path || pathname.startsWith(path + "/")) {
        return (titles as Record<string, string>)[locale] ?? titles.en;
      }
    }
    return "EquipTrack";
  };

  const userInitial = ((session?.user?.name || session?.user?.email || "?")[0]).toUpperCase();
  const userName = session?.user?.name || session?.user?.email || "";
  const userRole = (session?.user as any)?.role ?? "";

  const currentTheme = THEMES.find((t) => t.id === theme);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowThemeDropdown(false);
      }
    }
    if (showThemeDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showThemeDropdown]);

  return (
    <header
      className="sticky top-0 z-30 h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 border-b flex-shrink-0"
      style={{
        background: "color-mix(in srgb, var(--surface) 92%, transparent)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        borderColor: "var(--border)",
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onOpenMobile}
        aria-label="Open menu"
        className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors -ml-1"
        style={{ color: "var(--text-muted)" }}
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold flex-1 truncate">
        {getTitle()}
      </h1>

      {/* Right controls — all items same height (h-8) */}
      <div className="flex items-center gap-1.5">

        {/* Language switcher (dropdown) */}
        <LanguageSwitcher />

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-[var(--border)]" />

        {/* Theme dropdown — hidden on small mobile */}
        <div className="hidden sm:block relative" ref={dropdownRef}>
          <button
            onClick={() => setShowThemeDropdown((v) => !v)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          >
            <div
              className="w-3.5 h-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: currentTheme?.brandColor }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {currentTheme?.label[locale] ?? currentTheme?.label.en}
            </span>
            <ChevronDown size={12} className={cn("transition-transform", showThemeDropdown && "rotate-180")} style={{ color: "var(--text-subtle)" }} />
          </button>

          {showThemeDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl p-1.5 z-50 animate-fade-in"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text-subtle)" }}>Dark</div>
              {THEMES.filter((t) => t.mode === "dark").map((th_) => (
                <button
                  key={th_.id}
                  onClick={() => { setTheme(th_.id); setShowThemeDropdown(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    theme === th_.id
                      ? "bg-brand-500/10 text-brand-500"
                      : "hover:bg-[var(--surface-hover)]"
                  )}
                  style={theme !== th_.id ? { color: "var(--text-muted)" } : undefined}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: th_.brandColor }} />
                  <span className="flex-1 text-left">{th_.label[locale] ?? th_.label.en}</span>
                  {theme === th_.id && <span className="text-[10px]">✓</span>}
                </button>
              ))}
              <div className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />
              <div className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text-subtle)" }}>Light</div>
              {THEMES.filter((t) => t.mode === "light").map((th_) => (
                <button
                  key={th_.id}
                  onClick={() => { setTheme(th_.id); setShowThemeDropdown(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    theme === th_.id
                      ? "bg-brand-500/10 text-brand-500"
                      : "hover:bg-[var(--surface-hover)]"
                  )}
                  style={theme !== th_.id ? { color: "var(--text-muted)" } : undefined}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: th_.previewBg, border: `1.5px solid ${th_.brandColor}55` }}
                  />
                  <span className="flex-1 text-left">{th_.label[locale] ?? th_.label.en}</span>
                  {theme === th_.id && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150",
            pathname === "/settings"
              ? "bg-brand-500/10 text-brand-500"
              : "text-[var(--text-muted)] hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)]"
          )}
        >
          <Settings size={16} />
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2 h-8 px-1.5 rounded-lg transition-all duration-150",
            pathname === "/profile"
              ? "bg-brand-500/10"
              : "hover:bg-[var(--surface-hover)]"
          )}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgb(var(--brand-rgb) / 0.2), rgb(var(--brand-rgb) / 0.08))",
              border: "1px solid rgb(var(--brand-rgb) / 0.2)",
            }}
          >
            <span className="text-[10px] font-bold text-brand-500">{userInitial}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-none mb-0.5 max-w-[100px] truncate">
              {userName}
            </p>
            <p className="text-[10px] uppercase tracking-wide leading-none" style={{ color: "var(--text-subtle)" }}>
              {userRole}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
