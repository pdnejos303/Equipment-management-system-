// Path: src/app/(features)/migrate/BackupClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Download, Upload, CheckCircle2, AlertTriangle, HardDrive, RefreshCw } from "lucide-react";
import { showError, showSuccess, showConfirm } from "@/lib/swal";

type RestoreMode = "skip" | "replace";

interface RestoreStats {
  users: number;
  assets: number;
  assetPhotos: number;
  assignments: number;
  maintenanceRecords: number;
  bookings: number;
  images: number;
}

export function BackupClient() {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("skip");
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreStats | null>(null);

  // ── Export ──

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
        ?? `equip-backup-${Date.now()}.zip`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(t("backup.exportError"), err.message);
    }
    setExporting(false);
  };

  // ── Import ──

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.name.endsWith(".zip")) {
      showError(t("backup.invalidFile"));
      return;
    }

    const confirmed = await showConfirm({
      title: t("backup.confirmTitle"),
      text: restoreMode === "replace" ? t("backup.confirmReplace") : t("backup.confirmSkip"),
      confirmText: t("confirm.ok"),
      cancelText: t("confirm.cancel"),
      danger: restoreMode === "replace",
    });
    if (!confirmed) return;

    setRestoring(true);
    setRestoreResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", restoreMode);

      const res = await fetch("/api/backup", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setRestoreResult(result.stats);
      showSuccess(t("backup.restoreSuccess"), "");
    } catch (err: any) {
      showError(t("backup.restoreError"), err.message);
    }
    setRestoring(false);
  }, [restoreMode, t]);

  return (
    <div className="space-y-6">

      {/* ── Export ── */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-brand-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold mb-1" style={{ color: "var(--text-default)" }}>{t("backup.exportTitle")}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("backup.exportDesc")}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {[
                { label: t("backup.includes_assets") },
                { label: t("backup.includes_assignments") },
                { label: t("backup.includes_maintenance") },
                { label: t("backup.includes_images") },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-gray-400 bg-surface-dark rounded-lg px-3 py-2">
                  <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                  {item.label}
                </div>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary flex items-center gap-2"
            >
              {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? t("backup.exporting") : t("backup.exportBtn")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Restore ── */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <HardDrive size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold mb-1" style={{ color: "var(--text-default)" }}>{t("backup.restoreTitle")}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("backup.restoreDesc")}</p>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setRestoreMode("skip")}
                className={`text-left p-3 rounded-xl border transition ${
                  restoreMode === "skip"
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-border hover:border-gray-600"
                }`}
              >
                <p className={`text-sm font-semibold mb-0.5 ${restoreMode === "skip" ? "text-brand-500" : ""}`} style={restoreMode !== "skip" ? { color: "var(--text-muted)" } : undefined}>
                  {t("backup.modeSkip")}
                </p>
                <p className="text-xs text-gray-500">{t("backup.modeSkipDesc")}</p>
              </button>
              <button
                onClick={() => setRestoreMode("replace")}
                className={`text-left p-3 rounded-xl border transition ${
                  restoreMode === "replace"
                    ? "border-red-500 bg-red-500/10"
                    : "border-border hover:border-gray-600"
                }`}
              >
                <p className={`text-sm font-semibold mb-0.5 ${restoreMode === "replace" ? "text-red-400" : ""}`} style={restoreMode !== "replace" ? { color: "var(--text-muted)" } : undefined}>
                  {t("backup.modeReplace")}
                </p>
                <p className="text-xs text-gray-500">{t("backup.modeReplaceDesc")}</p>
              </button>
            </div>

            {restoreMode === "replace" && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{t("backup.replaceWarning")}</p>
              </div>
            )}

            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition ${
              restoring
                ? "border-gray-700 opacity-50 cursor-not-allowed"
                : "border-gray-700 hover:border-brand-500"
            }`}>
              {restoring ? (
                <>
                  <RefreshCw size={28} className="text-gray-500 mb-2 animate-spin" />
                  <span className="text-sm text-gray-400">{t("backup.restoring")}</span>
                </>
              ) : (
                <>
                  <Upload size={28} className="text-gray-500 mb-2" />
                  <span className="text-sm text-gray-400">{t("backup.dropZip")}</span>
                  <span className="text-xs text-gray-600 mt-1">.zip</span>
                </>
              )}
              <input
                type="file"
                accept=".zip"
                onChange={handleFile}
                disabled={restoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Restore Result ── */}
      {restoreResult && (
        <div className="card border border-green-500/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} className="text-green-500" />
            <h2 className="font-semibold" style={{ color: "var(--text-default)" }}>{t("backup.restoreSuccess")}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("backup.stat_assets"), value: restoreResult.assets },
              { label: t("backup.stat_users"), value: restoreResult.users },
              { label: t("backup.stat_assignments"), value: restoreResult.assignments },
              { label: t("backup.stat_maintenance"), value: restoreResult.maintenanceRecords },
              { label: t("backup.stat_bookings"), value: restoreResult.bookings },
              { label: t("backup.stat_photos"), value: restoreResult.assetPhotos },
              { label: t("backup.stat_images"), value: restoreResult.images },
            ].map((s) => (
              <div key={s.label} className="bg-surface-dark rounded-lg p-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-brand-500">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
