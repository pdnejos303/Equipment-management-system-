// Path: src/app/(features)/migrate/BackupClient.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Download, Upload, CheckCircle2, AlertTriangle, HardDrive, RefreshCw, Lock, ImageIcon, FileText, Eye, EyeOff } from "lucide-react";
import { showError, showSuccess, showConfirm, showPasswordPrompt } from "@/lib/swal";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";

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

const ENC_EXT = ".zip.enc";

function defaultFilename(): string {
  return `equip-backup-${format(new Date(), "yyyyMMdd-HHmmss")}`;
}

export function BackupClient() {
  const { t } = useI18n();

  // ── Export modal state ──
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fileName, setFileName] = useState(defaultFilename());
  const [includeImages, setIncludeImages] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Restore state ──
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("skip");
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreStats | null>(null);

  const sanitizedPreview = useMemo(
    () => (fileName.trim() ? fileName.trim() : defaultFilename()),
    [fileName]
  );

  // ── Export ──

  const openExportModal = () => {
    setFileName(defaultFilename());
    setIncludeImages(true);
    setPassword("");
    setShowPassword(false);
    setExportOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fileName.trim()) params.set("name", fileName.trim());
      if (!includeImages) params.set("images", "false");
      if (password) params.set("password", password);

      const res = await fetch(`/api/backup?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const headerName = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1];
      a.href = url;
      a.download = headerName ?? `${sanitizedPreview}${password ? ENC_EXT : ".zip"}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
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

    const isEncrypted = file.name.toLowerCase().endsWith(ENC_EXT);
    if (!isEncrypted && !file.name.toLowerCase().endsWith(".zip")) {
      showError(t("backup.invalidFile"));
      return;
    }

    // Prompt for password if encrypted (.zip.enc)
    let restorePassword = "";
    if (isEncrypted) {
      const entered = await showPasswordPrompt({
        title: t("backup.passwordPromptTitle"),
        text: t("backup.passwordPromptText"),
        placeholder: t("backup.passwordPromptPlaceholder"),
        confirmText: t("confirm.ok"),
        cancelText: t("confirm.cancel"),
      });
      if (!entered) return;
      restorePassword = entered;
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
      if (restorePassword) formData.append("password", restorePassword);

      const res = await fetch("/api/backup", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) {
        if (result.error === "password_wrong") {
          throw new Error(t("backup.passwordWrong"));
        }
        throw new Error(result.error || result.message);
      }

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
              onClick={openExportModal}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} />
              {t("backup.exportBtn")}
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
                  <span className="text-xs text-gray-600 mt-1">.zip · .zip.enc</span>
                </>
              )}
              <input
                type="file"
                accept=".zip,.enc"
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

      {/* ── Export Options Modal ── */}
      <Modal
        open={exportOpen}
        onClose={() => !exporting && setExportOpen(false)}
        title={t("backup.exportModalTitle")}
        width="max-w-md"
      >
        <div className="space-y-5">
          {/* File name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-default)" }}>
              <FileText size={14} className="text-gray-500" />
              {t("backup.fileNameLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={defaultFilename()}
                className="input w-full pr-16"
                disabled={exporting}
                spellCheck={false}
                autoComplete="off"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                {password ? ENC_EXT : ".zip"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {password
                ? t("backup.encryptedExt", sanitizedPreview)
                : t("backup.fileNameHint")}
            </p>
          </div>

          {/* Include images toggle */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
            includeImages ? "border-brand-500/40 bg-brand-500/5" : "border-border hover:border-gray-600"
          }`}>
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              disabled={exporting}
              className="mt-0.5 w-4 h-4 accent-brand-500 cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-default)" }}>
                <ImageIcon size={14} className="text-gray-500" />
                {t("backup.includeImagesLabel")}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t("backup.includeImagesHint")}</p>
            </div>
          </label>

          {/* Password */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-2" style={{ color: "var(--text-default)" }}>
              <span className="flex items-center gap-2">
                <Lock size={14} className="text-gray-500" />
                {t("backup.passwordLabel")}
              </span>
              <span className="text-xs text-gray-500 font-normal">{t("backup.passwordOptional")}</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("backup.passwordPlaceholder")}
                className="input w-full pr-10"
                disabled={exporting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{t("backup.passwordHint")}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setExportOpen(false)}
              disabled={exporting}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:border-gray-500 transition disabled:opacity-50"
              style={{ color: "var(--text-muted)" }}
            >
              {t("backup.cancel")}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary flex items-center gap-2"
            >
              {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? t("backup.exporting") : t("backup.download")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
