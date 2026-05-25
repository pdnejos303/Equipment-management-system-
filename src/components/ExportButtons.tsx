// Path: src/components/ExportButtons.tsx
"use client";

import { useState } from "react";
import { FileText, TableProperties, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  /** Extra query params (e.g. filters) appended to the export URL. */
  extraParams?: Record<string, string>;
}

export function ExportButtons({ extraParams }: Props = {}) {
  const { locale } = useI18n();
  const [pdfLoading, setPdfLoading] = useState(false);

  const buildQuery = (extra: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ lang: locale, ...(extraParams || {}), ...extra });
    return qs.toString();
  };

  const handleCSV = () => {
    window.open(`/api/export?${buildQuery({ format: "csv" })}`, "_blank");
  };

  const handlePDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/export?${buildQuery({ pdf: "1" })}`, { method: "POST" });
      if (!res.ok) throw new Error(`PDF render failed (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `equipment_${new Date().toISOString().slice(0, 10)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("PDF export failed. See console.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: "var(--surface-hover)" }}>
      <button
        onClick={handleCSV}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:text-green-400 hover:bg-green-500/5 transition-all duration-200 border-r border-[var(--border)]"
        style={{ color: "var(--text-muted)" }}
        title="Export CSV"
      >
        <TableProperties size={14} />
        <span className="font-medium">CSV</span>
      </button>
      <button
        onClick={handlePDF}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
        style={{ color: "var(--text-muted)" }}
        title="Export PDF"
      >
        {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        <span className="font-medium">PDF</span>
      </button>
    </div>
  );
}
