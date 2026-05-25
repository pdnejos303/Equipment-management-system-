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
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const buildQuery = (extra: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ lang: locale, ...(extraParams || {}), ...extra });
    return qs.toString();
  };

  // Shared blob download — keeps session cookie attached (no popup-blocker risk).
  const downloadFrom = async (
    url: string,
    init: RequestInit,
    fallbackName: string
  ) => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="([^"]+)"/);
    const filename = match?.[1] || fallbackName;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleCSV = async () => {
    if (csvLoading) return;
    setCsvLoading(true);
    try {
      await downloadFrom(
        `/api/export?${buildQuery({ format: "csv" })}`,
        { method: "GET" },
        `equipment_${stamp()}.csv`
      );
    } catch (err) {
      console.error(err);
      alert("CSV export failed. See console.");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await downloadFrom(
        `/api/export?${buildQuery({ pdf: "1" })}`,
        { method: "POST" },
        `equipment_${stamp()}.pdf`
      );
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
        disabled={csvLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:text-green-400 hover:bg-green-500/5 transition-all duration-200 border-r border-[var(--border)] disabled:opacity-50 disabled:cursor-wait"
        style={{ color: "var(--text-muted)" }}
        title="Export CSV"
      >
        {csvLoading ? <Loader2 size={14} className="animate-spin" /> : <TableProperties size={14} />}
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
