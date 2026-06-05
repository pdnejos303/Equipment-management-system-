// Path: src/components/labels/LabelLogoControl.tsx
// ============================================================
// File: LabelLogoControl.tsx
// Path: equip-track/src/components/labels/LabelLogoControl.tsx
// Desc: Optional brand-logo picker for label printing.
//       Reads an image as a base64 data URL and bubbles it up;
//       the parent persists it (localStorage) and passes it to
//       LabelTemplate. Presence of a logo = shown; remove = off.
// ============================================================

"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Props {
  logoSrc: string | null;
  onChange: (dataUrl: string | null) => void;
}

// Keep the stored data URL small so localStorage stays well under quota.
const MAX_LOGO_BYTES = 200 * 1024; // 200 KB

export function LabelLogoControl({ logoSrc, onChange }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("labels.logoErrorType"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t("labels.logoErrorSize"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setError(t("labels.logoErrorRead"));
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-surface-dark">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-md bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: "var(--text-default)" }}>{t("labels.logo")}</div>
          <div className="text-xs text-gray-500">{t("labels.logoHint")}</div>
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 rounded-md border border-border bg-surface hover:border-gray-600 transition text-xs"
            style={{ color: "var(--text-default)" }}
          >
            {logoSrc ? t("labels.logoChange") : t("labels.logoUpload")}
          </button>
          {logoSrc && (
            <button
              type="button"
              onClick={() => { onChange(null); setError(null); }}
              className="px-3 py-1.5 rounded-md border border-border bg-surface hover:border-red-500/60 hover:text-red-400 transition text-xs text-gray-400"
            >
              {t("labels.logoRemove")}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}
