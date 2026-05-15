// Path: src/components/ExportButtons.tsx
"use client";

import { FileText, TableProperties } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ExportButtons() {
  const { locale } = useI18n();

  const handleCSV = () => {
    window.open(`/api/export?format=csv&lang=${locale}`, "_blank");
  };

  const handlePDF = async () => {
    const res = await fetch(`/api/export?lang=${locale}`, { method: "POST" });
    const html = await res.text();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
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
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
        style={{ color: "var(--text-muted)" }}
        title="Export PDF"
      >
        <FileText size={14} />
        <span className="font-medium">PDF</span>
      </button>
    </div>
  );
}
