// Path: src/components/Sidebar.tsx
"use client";

import { useState, useEffect, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Package, Bell, CalendarClock, BarChart3, Calendar,
  ChevronLeft, ChevronRight, LayoutDashboard, X,
  DatabaseBackup, UserCog, ScanLine, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const MAIN_NAV = [
  { key: "overview", tKey: "nav.overview", href: "/overview", icon: LayoutDashboard },
  { key: "assets", tKey: "nav.assets", href: "/assets", icon: Package },
  { key: "scan", tKey: "nav.scan", href: "/scan", icon: ScanLine },
  { key: "in-use", tKey: "nav.inUse", href: "/in-use", icon: UserCheck },
  { key: "alerts", tKey: "nav.alerts", href: "/alerts", icon: Bell, hasBadge: true },
  { key: "bookings", tKey: "nav.bookings", href: "/bookings", icon: CalendarClock },
  { key: "calendar", tKey: "nav.calendar", href: "/calendar", icon: Calendar },
  { key: "reports", tKey: "nav.reports", href: "/reports", icon: BarChart3 },
] as const;

const ADMIN_NAV = [
  { key: "users", tKey: "users.nav", href: "/users", icon: UserCog },
  { key: "migrate", tKey: "migrate.nav", href: "/migrate", icon: DatabaseBackup },
] as const;

type NavItem = {
  key: string;
  tKey: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  hasBadge?: boolean;
};

interface SidebarProps {
  alertCount?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ alertCount = 0, mobileOpen, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { t, locale } = useI18n();

  const toggleCollapsed = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  };

  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const showLabel = !collapsed || mobileOpen;

  // Prefetch all routes on mount for instant navigation
  useEffect(() => {
    const allRoutes = [
      ...MAIN_NAV.map((n) => n.href),
      "/users",
      "/migrate",
      "/in-use",
    ];
    allRoutes.forEach((href) => router.prefetch(href));
  }, [router]);

  useEffect(() => { onCloseMobile(); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // (onCloseMobile identity is stable from parent useState setter)

  const isActive = (href: string) => {
    if (href === "/overview") return pathname === "/overview";
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.key}
        href={item.href}
        className={cn(
          "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group min-h-[44px]",
          active
            ? "bg-brand-500/10 text-brand-500"
            : "text-gray-400 hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)]"
        )}
        aria-label={!showLabel ? t(item.tKey) : undefined}
        aria-current={active ? "page" : undefined}
        title={!showLabel ? t(item.tKey) : undefined}
      >
        {/* Active indicator bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500" style={{ boxShadow: "0 0 8px rgb(var(--brand-rgb) / 0.4)" }} />
        )}
        <item.icon
          size={17}
          className={cn(
            "flex-shrink-0 transition-colors duration-200",
            active ? "text-brand-500" : "text-gray-400 group-hover:text-[var(--text-default)]"
          )}
        />
        {showLabel && (
          <span className="whitespace-nowrap truncate flex-1">{t(item.tKey)}</span>
        )}
        {item.hasBadge && alertCount > 0 && (
          <span
            className={cn(
              "bg-red-500 text-white text-[10px] font-bold rounded-md min-w-[17px] h-[17px] flex items-center justify-center px-1 alert-badge flex-shrink-0",
              !showLabel && "absolute top-1 right-1 min-w-[15px] h-[15px] text-[9px]"
            )}
            role="status"
            aria-live="polite"
            aria-label={`${alertCount > 99 ? "99+" : alertCount} unread alerts`}
          >
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </Link>
    );
  };

  const sectionLabel = (th_: string, en: string, ja: string) => {
    if (!showLabel) return null;
    const label = locale === "th" ? th_ : locale === "ja" ? ja : en;
    return (
      <p className="px-5 pt-3 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest select-none">
        {label}
      </p>
    );
  };

  const navContent = (
    <>
      {/* Logo + Collapse Toggle */}
      <div
        className={cn(
          "flex items-center gap-2.5 h-14 border-b border-[var(--border)]/60 flex-shrink-0 relative",
          showLabel ? "px-4" : "justify-center px-2"
        )}
      >
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-rgb)/0.12)] to-transparent" />
        {showLabel ? (
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-black font-extrabold text-sm flex-shrink-0" style={{ boxShadow: "0 0 12px rgb(var(--brand-rgb) / 0.2)" }} aria-hidden="true">
            A
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="group relative w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-black font-extrabold text-sm flex-shrink-0 hover:brightness-110 active:scale-95 transition-all duration-150"
            style={{ boxShadow: "0 0 12px rgb(var(--brand-rgb) / 0.2)" }}
          >
            <span className="transition-opacity duration-150 group-hover:opacity-0">A</span>
            <ChevronRight size={16} strokeWidth={2.5} className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
          </button>
        )}
        {showLabel && (
          <span className="font-bold text-[15px] whitespace-nowrap flex-1 tracking-tight">
            Asset Management
          </span>
        )}
        {showLabel && (
          <button
            onClick={() => toggleCollapsed(true)}
            aria-label="Collapse sidebar"
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-subtle)] hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)] transition-all duration-200 border border-transparent hover:border-[var(--border)]/60"
          >
            <ChevronLeft size={15} />
          </button>
        )}
        <button
          onClick={onCloseMobile}
          aria-label="Close menu"
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-subtle)] hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)] transition-all duration-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {sectionLabel("เมนูหลัก", "Main", "メイン")}
        <div className="space-y-0.5">
          {(MAIN_NAV as unknown as NavItem[]).map(renderNavItem)}
        </div>

        {isAdmin && (
          <>
            <div className={cn("mt-3 mb-0 mx-3 border-t border-border/50")} />
            {sectionLabel("จัดการระบบ", "Admin", "管理")}
            <div className="space-y-0.5">
              {(ADMIN_NAV as unknown as NavItem[]).map(renderNavItem)}
            </div>
          </>
        )}
      </div>

    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden sidebar-backdrop"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile sidebar */}
      <nav
        id="mobile-sidebar"
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-surface border-r border-border flex flex-col transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </nav>

      {/* Desktop sidebar */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "hidden lg:flex flex-col bg-surface border-r border-border h-screen sticky top-0 transition-all duration-200 relative",
          collapsed ? "w-[60px]" : "w-56"
        )}
      >
        {navContent}
      </nav>
    </>
  );
}
