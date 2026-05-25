// Path: src/app/asset/[code]/AssetPublicClient.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { formatDate, formatMoney } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Package } from "lucide-react";

interface Props {
  asset: {
    code: string;
    name: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    category: string;
    status: string;
    photo: string | null;
  };
  purchasePrice: number;
  purchaseDate: string;
}

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  ACTIVE:      { color: "#16a34a", bg: "rgba(22,163,74,0.10)", dot: "#16a34a" },
  AVAILABLE:   { color: "#2563eb", bg: "rgba(37,99,235,0.10)", dot: "#2563eb" },
  MAINTENANCE: { color: "#d97706", bg: "rgba(217,119,6,0.10)", dot: "#d97706" },
  RETIRED:     { color: "#dc2626", bg: "rgba(220,38,38,0.10)", dot: "#dc2626" },
};

export function AssetPublicClient({ asset, purchasePrice, purchaseDate }: Props) {
  const { t, locale } = useI18n();
  const { labelFor } = useCategories();
  const sc = statusConfig[asset.status] || statusConfig.ACTIVE;

  return (
    <div className="min-h-screen bg-background font-sans" style={{ color: "var(--foreground)" }}>
      {/* Header bar */}
      <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between" style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)", backdropFilter: "blur(12px) saturate(140%)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgb(var(--brand-rgb) / 0.1)", border: "1px solid rgb(var(--brand-rgb) / 0.2)" }}>
            <Package size={14} className="text-brand-500" />
          </div>
          <span className="text-sm font-bold tracking-tight">Asset Management</span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md mx-auto pb-10">
        {/* Asset photo hero */}
        {asset.photo ? (
          <div className="relative w-full aspect-video overflow-hidden">
            <img src={asset.photo} alt={asset.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--background), transparent 60%)" }} />
            {/* Status badge overlay */}
            <div className="absolute top-3 right-3">
              <span
                className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5"
                style={{ color: sc.color, backgroundColor: sc.bg, border: `1px solid ${sc.color}25` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dot }} />
                {t(`status.${asset.status}`)}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center relative" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                <Package size={28} style={{ color: "var(--text-subtle)" }} />
              </div>
              <p className="text-xs" style={{ color: "var(--text-subtle)" }}>{t("public.category")}</p>
            </div>
            {/* Status badge for no-photo state */}
            <div className="absolute top-[4.5rem] right-4">
              <span
                className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5"
                style={{ color: sc.color, backgroundColor: sc.bg, border: `1px solid ${sc.color}25` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dot }} />
                {t(`status.${asset.status}`)}
              </span>
            </div>
          </div>
        )}

        {/* Asset identity */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-brand-500 font-mono font-bold text-sm tracking-wide mb-1">{asset.code}</p>
          <h1 className="text-2xl font-bold leading-tight mb-1">{asset.name}</h1>
          {(asset.brand || asset.model) && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{[asset.brand, asset.model].filter(Boolean).join(" · ")}</p>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 px-5 mb-4">
          {[
            [t("public.category"), labelFor(asset.category)],
            [t("public.serial"), asset.serialNumber || "—"],
            [t("public.purchaseDate"), formatDate(purchaseDate, locale)],
            [t("assetDetail.purchasePrice"), `${t("common.baht")}${formatMoney(purchasePrice, locale)}`],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-subtle)", letterSpacing: "0.06em" }}>{label}</p>
              <p className="text-sm font-semibold leading-snug">{val}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 mt-8 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--text-subtle)" }}>
            <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgb(var(--brand-rgb) / 0.1)" }}>
              <Package size={9} className="text-brand-500" style={{ opacity: 0.7 }} />
            </div>
            <span>Asset Management</span>
            {process.env.NEXT_PUBLIC_COMPANY_NAME && (
              <>
                <span>·</span>
                <span>{process.env.NEXT_PUBLIC_COMPANY_NAME}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
