// Path: src/components/ExportButtons.tsx
"use client";

import { useState } from "react";
import { FileText, TableProperties, Loader2, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";

interface Props {
  /** Extra query params (e.g. filters) appended to the export URL. */
  extraParams?: Record<string, string>;
}

export function ExportButtons({ extraParams }: Props = {}) {
  const { locale, t } = useI18n();
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "pdf" | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const buildQuery = (extra: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ 
      lang: locale, 
      ...(extraParams || {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...extra 
    });
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

  const handleConfirmExport = async () => {
    if (exportType === "csv") {
      setCsvLoading(true);
      setShowModal(false);
      try {
        await downloadFrom(
          `/api/export?${buildQuery({ format: "csv" })}`,
          { method: "GET" },
          `equipment_${stamp()}.csv`
        );
      } catch (err) {
        console.error(err);
        alert(t("export.csvFailed") || "CSV export failed");
      } finally {
        setCsvLoading(false);
        setExportType(null);
      }
    } else if (exportType === "pdf") {
      setPdfLoading(true);
      setShowModal(false);
      try {
        await downloadFrom(
          `/api/export?${buildQuery({ pdf: "1" })}`,
          { method: "POST" },
          `equipment_${stamp()}.pdf`
        );
      } catch (err) {
        console.error(err);
        alert(t("export.pdfFailed") || "PDF export failed");
      } finally {
        setPdfLoading(false);
        setExportType(null);
      }
    }
  };

  const openExportModal = (type: "csv" | "pdf") => {
    setExportType(type);
    setShowModal(true);
  };

  return (
    <>
      <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: "var(--surface-hover)" }}>
        <button
          onClick={() => openExportModal("csv")}
          disabled={csvLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:text-green-400 hover:bg-green-500/5 transition-all duration-200 border-r border-[var(--border)] disabled:opacity-50 disabled:cursor-wait"
          style={{ color: "var(--text-muted)" }}
          title={t("export.exportCsv") || "Export CSV"}
        >
          {csvLoading ? <Loader2 size={14} className="animate-spin" /> : <TableProperties size={14} />}
          <span className="font-medium">CSV</span>
        </button>
        <button
          onClick={() => openExportModal("pdf")}
          disabled={pdfLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          style={{ color: "var(--text-muted)" }}
          title={t("export.exportPdf") || "Export PDF"}
        >
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          <span className="font-medium">PDF</span>
        </button>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setExportType(null);
        }}
        title={locale === "th" ? "เลือกช่วงเวลาที่ต้องการ (ถ้ามี)" : "Select Time Period (Optional)"}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {locale === "th" 
              ? "สามารถระบุวันที่ซื้อ (Purchase Date) เริ่มต้นและสิ้นสุดเพื่อกรองข้อมูลที่ต้องการ Export ได้ หากไม่ระบุ ระบบจะดึงข้อมูลทั้งหมดตามตัวกรองปัจจุบัน"
              : "Specify a purchase date range to filter exported data. If left blank, all data matching current filters will be exported."}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1 text-gray-500">
                {locale === "th" ? "ตั้งแต่วันที่" : "Start Date"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1 text-gray-500">
                {locale === "th" ? "ถึงวันที่" : "End Date"}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={() => {
                setShowModal(false);
                setExportType(null);
              }}
              className="btn-secondary"
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              onClick={handleConfirmExport}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} />
              {locale === "th" ? "ยืนยันการ Export" : "Confirm Export"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
