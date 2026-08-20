// Path: src/components/labels/LabelPrintDialog.tsx
// ============================================================
// File: LabelPrintDialog.tsx
// Path: equip-track/src/components/labels/LabelPrintDialog.tsx
// Desc: Dialog for printing a single asset label
//       Supports label size selection, template selection,
//       copies count, and live preview
// ============================================================

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { LabelTemplate } from "./LabelTemplate";
import { LabelLogoControl } from "./LabelLogoControl";
import {
  LABEL_SIZES,
  LABEL_TEMPLATES,
  getCompatibleTemplates,
  getSavedLogo,
  setSavedLogo,
  mmToPx,
  type LabelAsset,
  type LabelSize,
  type LabelTemplateType,
} from "./label-config";

interface Props {
  asset: LabelAsset;
  open: boolean;
  onClose: () => void;
}

export function LabelPrintDialog({ asset, open, onClose }: Props) {
  const { t } = useI18n();
  const [selectedSize, setSelectedSize] = useState<LabelSize>(LABEL_SIZES[0]);
  const [template, setTemplate] = useState<LabelTemplateType>("compact");
  const [copies, setCopies] = useState(1);
  const [customWidth, setCustomWidth] = useState(80);
  const [customHeight, setCustomHeight] = useState(50);
  const [useCustom, setUseCustom] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLogoSrc(getSavedLogo()); }, []);

  const handleLogoChange = useCallback((dataUrl: string | null) => {
    setSavedLogo(dataUrl);
    setLogoSrc(dataUrl);
  }, []);

  const activeWidth = useCustom ? customWidth : selectedSize.widthMm;
  const activeHeight = useCustom ? customHeight : selectedSize.heightMm;

  const compatibleTemplates = getCompatibleTemplates(activeWidth, activeHeight);

  // auto-switch template if current isn't compatible
  const effectiveTemplate = compatibleTemplates.find((t) => t.id === template)
    ? template
    : compatibleTemplates[0]?.id || "qr-only";

  // Calculate preview scale to fit in the preview area
  const previewMaxWidth = 360;
  const previewMaxHeight = 280;
  const labelPxW = mmToPx(activeWidth);
  const labelPxH = mmToPx(activeHeight);
  const previewScale = Math.min(
    previewMaxWidth / labelPxW,
    previewMaxHeight / labelPxH,
    1.5
  );

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const labelHtml = printRef.current.innerHTML;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t("labels.printTitle")} - ${asset.code}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: ${activeWidth}mm ${activeHeight}mm;
      margin: 0;
    }

    @media print {
      html, body {
        width: ${activeWidth}mm;
        height: ${activeHeight}mm;
        margin: 0;
        padding: 0;
      }
      .label-copy {
        width: ${activeWidth}mm;
        height: ${activeHeight}mm;
        page-break-after: always;
      }
      .label-copy:last-child {
        page-break-after: auto;
      }
    }

    body {
      font-family: 'Sarabun', sans-serif;
    }

    .label-copy {
      width: ${activeWidth}mm;
      height: ${activeHeight}mm;
    }

    .label-template-root > div {
      border: none !important;
    }
  </style>
</head>
<body>
  ${Array.from({ length: copies })
    .map(() => `<div class="label-copy">${labelHtml}</div>`)
    .join("")}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 300);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  }, [copies, activeWidth, activeHeight, asset.code, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-default)" }}>{t("labels.printSingle")}</h2>
            <p className="text-sm text-gray-500">{asset.code} — {asset.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Settings */}
            <div className="space-y-5">
              {/* Label Size */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.labelSize")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {LABEL_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => { setSelectedSize(size); setUseCustom(false); }}
                      className={`text-left p-3 rounded-lg border transition text-sm ${
                        !useCustom && selectedSize.id === size.id
                          ? "border-brand-500 bg-brand-500/10 text-brand-400"
                          : "border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      <div className="font-semibold">{size.widthMm} × {size.heightMm} mm</div>
                      <div className="text-xs mt-0.5 text-gray-500">{t(size.description)}</div>
                    </button>
                  ))}
                  {/* Custom size */}
                  <button
                    onClick={() => setUseCustom(true)}
                    className={`text-left p-3 rounded-lg border transition text-sm col-span-2 ${
                      useCustom
                        ? "border-brand-500 bg-brand-500/10 text-brand-400"
                        : "border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold">{t("labels.customSize")}</div>
                    {useCustom && (
                      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">W:</span>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(Number(e.target.value) || 20)}
                            className="w-16 px-2 py-1 text-xs rounded bg-black/30 border border-border" style={{ color: "var(--text-default)" }}
                            min={20}
                            max={200}
                          />
                          <span className="text-xs text-gray-500">mm</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">H:</span>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(Number(e.target.value) || 15)}
                            className="w-16 px-2 py-1 text-xs rounded bg-black/30 border border-border" style={{ color: "var(--text-default)" }}
                            min={15}
                            max={200}
                          />
                          <span className="text-xs text-gray-500">mm</span>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Template */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.template")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {LABEL_TEMPLATES.map((tmpl) => {
                    const isCompatible = compatibleTemplates.some((c) => c.id === tmpl.id);
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => isCompatible && setTemplate(tmpl.id)}
                        disabled={!isCompatible}
                        className={`text-left p-3 rounded-lg border transition text-sm ${
                          effectiveTemplate === tmpl.id
                            ? "border-brand-500 bg-brand-500/10 text-brand-400"
                            : isCompatible
                            ? "border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                            : "border-border bg-surface-dark text-gray-600 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="font-semibold">{t(tmpl.name)}</div>
                        <div className="text-xs mt-0.5 text-gray-500">{t(tmpl.description)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Copies */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.copies")}</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-9 h-9 rounded-lg border border-border bg-surface-dark hover:bg-surface flex items-center justify-center transition"
                    style={{ color: "var(--text-muted)" }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                    className="w-16 text-center px-2 py-1.5 rounded-lg bg-surface-dark border border-border font-mono" style={{ color: "var(--text-default)" }}
                    min={1}
                    max={99}
                  />
                  <button
                    onClick={() => setCopies(Math.min(99, copies + 1))}
                    className="w-9 h-9 rounded-lg border border-border bg-surface-dark hover:bg-surface flex items-center justify-center transition"
                    style={{ color: "var(--text-muted)" }}
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">{t("labels.copiesUnit")}</span>
                </div>
              </div>

              {/* Logo */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.logo")}</h3>
                <LabelLogoControl logoSrc={logoSrc} onChange={handleLogoChange} />
              </div>

              {/* Info */}
              <div className="bg-surface-dark rounded-lg p-3 border border-border">
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t("labels.printerTip")}
                </p>
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.preview")}</h3>
              <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center min-h-[320px]">
                <div>
                  <LabelTemplate
                    asset={asset}
                    template={effectiveTemplate}
                    widthMm={activeWidth}
                    heightMm={activeHeight}
                    scale={previewScale}
                    showBorder
                    logoSrc={logoSrc}
                  />
                </div>
              </div>
              <div className="text-center mt-2 text-xs text-gray-500">
                {activeWidth} × {activeHeight} mm ({t("labels.actualSize")})
              </div>

              {/* Hidden print area (actual size for print window) */}
              <div className="sr-only">
                <div ref={printRef}>
                  <LabelTemplate
                    asset={asset}
                    template={effectiveTemplate}
                    widthMm={activeWidth}
                    heightMm={activeHeight}
                    scale={1}
                    showBorder={false}
                    logoSrc={logoSrc}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-dark/50">
          <button onClick={onClose} className="btn-ghost text-sm">
            {t("confirm.cancel")}
          </button>
          <button onClick={handlePrint} className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t("labels.printNow")} {copies > 1 ? `(${copies} ${t("labels.copiesUnit")})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
