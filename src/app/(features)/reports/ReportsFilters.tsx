// Path: src/app/(features)/reports/ReportsFilters.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { Calendar, X } from "lucide-react";

export interface ReportFilters {
  asOf: string;
  category: string;
  status: string;
  location: string;
}

interface Props {
  filters: ReportFilters;
  locations: string[];
}

const STATUSES = ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"] as const;

export function ReportsFilters({ filters, locations }: Props) {
  const { t } = useI18n();
  const { categories, emojiFor } = useCategories();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasAny = !!(filters.asOf || filters.category || filters.status || filters.location);

  const apply = (patch: Partial<ReportFilters>) => {
    const next = { ...filters, ...patch };
    const qs = new URLSearchParams();
    if (next.asOf) qs.set("asOf", next.asOf);
    if (next.category) qs.set("category", next.category);
    if (next.status) qs.set("status", next.status);
    if (next.location) qs.set("location", next.location);
    const url = qs.toString() ? `/reports?${qs.toString()}` : "/reports";
    startTransition(() => router.replace(url));
  };

  return (
    <div
      className={`card p-4 mb-6 animate-fade-in transition-opacity ${isPending ? "opacity-60" : ""}`}
    >
      {hasAny && (
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => apply({ asOf: "", category: "", status: "", location: "" })}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            <X size={12} />
            {t("reportPage.clearFilters")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1 flex items-center gap-1">
            <Calendar size={11} /> {t("reportPage.asOfDate")}
          </span>
          <input
            type="date"
            value={filters.asOf}
            onChange={(e) => apply({ asOf: e.target.value })}
            max={new Date().toISOString().slice(0, 10)}
            className="input w-full"
            title={t("reportPage.asOfHint")}
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">
            {t("nav.assets") || "Category"}
          </span>
          <select
            value={filters.category}
            onChange={(e) => apply({ category: e.target.value })}
            className="input w-full"
          >
            <option value="">{t("reportPage.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {(c.emoji || emojiFor(c.key))} {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">
            {t("reportPage.statusTitle")}
          </span>
          <select
            value={filters.status}
            onChange={(e) => apply({ status: e.target.value })}
            className="input w-full"
          >
            <option value="">{t("reportPage.allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">
            {t("reportPage.location")}
          </span>
          <input
            type="text"
            list="report-locations"
            value={filters.location}
            onChange={(e) => apply({ location: e.target.value })}
            placeholder={t("reportPage.locationPlaceholder")}
            className="input w-full"
          />
          <datalist id="report-locations">
            {locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
      </div>
    </div>
  );
}
