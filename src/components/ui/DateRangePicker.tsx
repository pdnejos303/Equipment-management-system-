// Path: src/components/ui/DateRangePicker.tsx
"use client";

import { Calendar, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type RangePreset = "7" | "30" | "90" | "180" | "365" | "custom";

const PRESETS: Exclude<RangePreset, "custom">[] = ["7", "30", "90", "180", "365"];

interface Props {
  range: RangePreset;
  onRangeChange: (r: RangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function DateRangePicker({
  range, onRangeChange, customFrom, customTo,
  onCustomFromChange, onCustomToChange, onRefresh, loading,
}: Props) {
  const { t } = useI18n();

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-[32px] ${
      active
        ? "bg-brand-500 text-black shadow-sm"
        : "text-[var(--text-muted)] hover:text-[var(--text-default)]"
    }`;

  const pillStyle = (active: boolean) =>
    active ? { boxShadow: "0 0 10px rgb(var(--brand-rgb) / 0.15)" } : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1 rounded-xl border border-[var(--border)]/60"
        style={{ background: "var(--surface-hover)" }}
      >
        {PRESETS.map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={pillClass(range === r)}
            style={pillStyle(range === r)}
          >
            {t(`dashboard.range${r}`)}
          </button>
        ))}
        <button
          onClick={() => onRangeChange("custom")}
          className={`${pillClass(range === "custom")} flex items-center gap-1`}
          style={pillStyle(range === "custom")}
        >
          <Calendar size={12} />
          {t("dashboard.rangeCustom")}
        </button>
        <div className="w-px h-5 bg-[var(--border)] mx-0.5 shrink-0" />
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-default)] hover:bg-[var(--surface-active)] transition-all min-h-[32px] flex-shrink-0"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="input-sm max-w-[160px]"
          />
          <span className="text-gray-500 text-sm">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="input-sm max-w-[160px]"
          />
        </div>
      )}
    </div>
  );
}
