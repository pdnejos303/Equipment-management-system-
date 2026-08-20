// Path: src/components/labels/BatchLabelDialog.tsx
// ============================================================
// File: BatchLabelDialog.tsx
// Path: equip-track/src/components/labels/BatchLabelDialog.tsx
// Desc: Dialog for batch printing multiple asset labels on A4 sheets
//       Supports various A4 label sheet layouts (Avery-compatible)
//       with live preview, page navigation, and template selection
// ============================================================

"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";
import { LabelTemplate } from "./LabelTemplate";
import {
  A4_LAYOUTS,
  LABEL_TEMPLATES,
  CUSTOM_LAYOUT_ID,
  DEFAULT_CUSTOM_LAYOUT,
  CUT_LINE_COLOR,
  CUT_LINE_WIDTH_MM,
  buildCustomLayout,
  getCompatibleTemplates,
  getLabelsPerSheet,
  getSavedLogo,
  setSavedLogo,
  mmToPx,
  type A4SheetLayout,
  type CustomLayoutConfig,
  type LabelAsset,
  type LabelTemplateType,
} from "./label-config";
import { LabelLogoControl } from "./LabelLogoControl";

interface Props {
  assets: LabelAsset[];
  open: boolean;
  onClose: () => void;
}

export function BatchLabelDialog({ assets, open, onClose }: Props) {
  const { t } = useI18n();
  const [presetId, setPresetId] = useState<string>(A4_LAYOUTS[0].id);
  const [customCfg, setCustomCfg] = useState<CustomLayoutConfig>(DEFAULT_CUSTOM_LAYOUT);
  const [template, setTemplate] = useState<LabelTemplateType>("compact");
  const [previewPage, setPreviewPage] = useState(0);
  const [startPosition, setStartPosition] = useState(0);
  const [showCutLines, setShowCutLines] = useState(false);
  const [colorTheme, setColorTheme] = useState<string>("classic");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); setLogoSrc(getSavedLogo()); }, []);

  const handleLogoChange = useCallback((dataUrl: string | null) => {
    setSavedLogo(dataUrl);
    setLogoSrc(dataUrl);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isCustom = presetId === CUSTOM_LAYOUT_ID;
  const layout: A4SheetLayout = useMemo(() => {
    if (isCustom) return buildCustomLayout(customCfg);
    return A4_LAYOUTS.find((l) => l.id === presetId) ?? A4_LAYOUTS[0];
  }, [isCustom, customCfg, presetId]);

  const labelsPerSheet = getLabelsPerSheet(layout);
  const totalLabels = assets.length;

  const updateCustom = (patch: Partial<CustomLayoutConfig>) => {
    setCustomCfg((prev) => ({ ...prev, ...patch }));
    setPreviewPage(0);
  };

  const compatibleTemplates = getCompatibleTemplates(layout.labelWidthMm, layout.labelHeightMm);
  const effectiveTemplate = compatibleTemplates.find((t) => t.id === template)
    ? template
    : compatibleTemplates[0]?.id || "compact";

  // Build pages of assets
  const pages = useMemo(() => {
    const result: (LabelAsset | null)[][] = [];
    let idx = 0;

    // First page (may have startPosition empty slots)
    const firstPage: (LabelAsset | null)[] = [];
    for (let i = 0; i < labelsPerSheet; i++) {
      if (i < startPosition) {
        firstPage.push(null);
      } else if (idx < assets.length) {
        firstPage.push(assets[idx++]);
      } else {
        firstPage.push(null);
      }
    }
    result.push(firstPage);

    // Subsequent pages
    while (idx < assets.length) {
      const page: (LabelAsset | null)[] = [];
      for (let i = 0; i < labelsPerSheet; i++) {
        if (idx < assets.length) {
          page.push(assets[idx++]);
        } else {
          page.push(null);
        }
      }
      result.push(page);
    }

    return result;
  }, [assets, labelsPerSheet, startPosition]);

  const totalPages = pages.length;

  // A4 preview scale
  const a4WidthPx = mmToPx(210);
  const a4HeightPx = mmToPx(297);
  const previewMaxH = 480;
  const previewScale = previewMaxH / a4HeightPx;

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    // Deep-clone the already-rendered DOM (QR <img> + JsBarcode SVG included)
    const clone = printRef.current.cloneNode(true) as HTMLDivElement;
    clone.className = "active-print-portal";
    clone.removeAttribute("aria-hidden");

    const style = document.createElement("style");
    style.setAttribute("data-print-style", "batch-labels");
    style.textContent = `
      @media screen {
        .active-print-portal { display: none !important; }
      }
      @media print {
        @page { size: A4; margin: 0; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        body > *:not(.active-print-portal) { display: none !important; }
        .active-print-portal {
          display: block !important;
          position: static !important;
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .active-print-portal .a4-page {
          position: relative;
          width: 210mm;
          height: 297mm;
          overflow: hidden;
          page-break-after: always;
          page-break-inside: avoid;
          background: #ffffff;
        }
        .active-print-portal .a4-page:last-child {
          page-break-after: auto;
        }
        .active-print-portal .label-cell {
          position: absolute;
          overflow: hidden;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          ${showCutLines ? `border: ${CUT_LINE_WIDTH_MM}mm solid ${CUT_LINE_COLOR};` : ""}
        }
        .active-print-portal .label-template-root > div {
          border: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;

    document.body.appendChild(style);
    document.body.appendChild(clone);

    const cleanup = () => {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      if (style.parentNode) style.parentNode.removeChild(style);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    // Give the browser a frame to apply the injected styles before printing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } finally {
          // Safari doesn't always fire afterprint — clean up defensively
          setTimeout(cleanup, 2000);
        }
      });
    });
  }, [showCutLines]);

  if (!open || !mounted) return null;

  const currentPage = pages[previewPage] || [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-overlay-in"
      style={{ willChange: "opacity" }}
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <div
        className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col animate-modal-in"
        style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-default)" }}>{t("labels.batchPrint")}</h2>
            <p className="text-sm text-gray-500">
              {totalLabels} {t("labels.items")} · {totalPages} {t("labels.pages")}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6">
            {/* Left: Settings */}
            <div className="space-y-5">
              {/* A4 Layout */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.sheetLayout")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {A4_LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setPresetId(l.id); setPreviewPage(0); }}
                      className={`text-left p-3 rounded-lg border transition text-sm ${
                        presetId === l.id
                          ? "border-brand-500 bg-brand-500/10 text-brand-400"
                          : "border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      <div className="font-semibold">
                        {l.cols}×{l.rows} ({l.cols * l.rows} {t("labels.labelsPerSheet")})
                      </div>
                      <div className="text-xs mt-0.5 text-gray-500">
                        {l.labelWidthMm} × {l.labelHeightMm} mm {t("labels.each")}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => { setPresetId(CUSTOM_LAYOUT_ID); setPreviewPage(0); }}
                    className={`text-left p-3 rounded-lg border transition text-sm ${
                      isCustom
                        ? "border-brand-500 bg-brand-500/10 text-brand-400"
                        : "border-dashed border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold">
                      {t("labels.a4.custom")}
                    </div>
                    <div className="text-xs mt-0.5 text-gray-500">
                      {t("labels.a4Desc.custom")}
                    </div>
                  </button>
                </div>

                {isCustom && (
                  <div className="mt-3 rounded-lg border border-border bg-surface-dark p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField
                        label={t("labels.cols")}
                        value={customCfg.cols}
                        min={1} max={10} step={1}
                        onChange={(v) => updateCustom({ cols: v })}
                      />
                      <NumberField
                        label={t("labels.rows")}
                        value={customCfg.rows}
                        min={1} max={20} step={1}
                        onChange={(v) => updateCustom({ rows: v })}
                      />
                      <NumberField
                        label={t("labels.marginTop")}
                        value={customCfg.marginTopMm}
                        min={0} max={40} step={0.5}
                        onChange={(v) => updateCustom({ marginTopMm: v })}
                      />
                      <NumberField
                        label={t("labels.marginLeft")}
                        value={customCfg.marginLeftMm}
                        min={0} max={40} step={0.5}
                        onChange={(v) => updateCustom({ marginLeftMm: v })}
                      />
                      <NumberField
                        label={t("labels.gapX")}
                        value={customCfg.gapXMm}
                        min={0} max={20} step={0.5}
                        onChange={(v) => updateCustom({ gapXMm: v })}
                      />
                      <NumberField
                        label={t("labels.gapY")}
                        value={customCfg.gapYMm}
                        min={0} max={20} step={0.5}
                        onChange={(v) => updateCustom({ gapYMm: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                      <span className="text-gray-500">{t("labels.computedLabelSize")}</span>
                      <span className="font-mono text-brand-400">
                        {layout.labelWidthMm} × {layout.labelHeightMm} mm
                        <span className="text-gray-500 ml-2">({labelsPerSheet}/{t("labels.labelsPerSheet")})</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Template */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.template")}</h3>
                <div className="flex flex-wrap gap-2">
                  {LABEL_TEMPLATES.map((tmpl) => {
                    const isCompatible = compatibleTemplates.some((c) => c.id === tmpl.id);
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => isCompatible && setTemplate(tmpl.id)}
                        disabled={!isCompatible}
                        className={`px-4 py-2 rounded-lg border transition text-sm ${
                          effectiveTemplate === tmpl.id
                            ? "border-brand-500 bg-brand-500/10 text-brand-400"
                            : isCompatible
                            ? "border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                            : "border-border bg-surface-dark text-gray-600 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        {t(tmpl.name)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.colorTheme") || "Color Theme"}</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "classic", label: "Classic (B/W)" },
                    { id: "ocean", label: "Ocean Blue" },
                    { id: "nature", label: "Nature Green" },
                    { id: "sunset", label: "Sunset Orange" },
                    { id: "dark", label: "Dark Mode" },
                    { id: "polka", label: "Polka Dots (Pink)" },
                    { id: "grid", label: "Grid Pattern" },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setColorTheme(theme.id)}
                      className={`px-3 py-1.5 rounded-lg border transition text-sm ${
                        colorTheme === theme.id
                          ? "border-brand-500 bg-brand-500/10 text-brand-400"
                          : "border-border bg-surface-dark text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start position */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.startPosition")}</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={startPosition}
                    onChange={(e) => {
                      setStartPosition(Math.max(0, Math.min(labelsPerSheet - 1, Number(e.target.value) || 0)));
                      setPreviewPage(0);
                    }}
                    className="w-20 px-3 py-1.5 rounded-lg bg-surface-dark border border-border font-mono text-sm" style={{ color: "var(--text-default)" }}
                    min={0}
                    max={labelsPerSheet - 1}
                  />
                  <span className="text-sm text-gray-500">{t("labels.skipCells")}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{t("labels.skipCellsHint")}</p>
              </div>

              {/* Print options: cut lines + logo */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.printOptions")}</h3>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCutLines}
                    onChange={(e) => setShowCutLines(e.target.checked)}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium" style={{ color: "var(--text-default)" }}>{t("labels.cutLines")}</span>
                    <span className="block text-xs text-gray-500">{t("labels.cutLinesHint")}</span>
                  </span>
                </label>

                <div className="mt-2">
                  <LabelLogoControl logoSrc={logoSrc} onChange={handleLogoChange} />
                </div>
              </div>

              {/* Selected assets list */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("labels.selectedAssets")}</h3>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-dark">
                  {assets.map((a, i) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-border/50 last:border-0"
                    >
                      <span className="text-gray-600 font-mono text-xs w-6">{i + 1}</span>
                      <span className="font-mono text-brand-400 font-semibold">{a.code}</span>
                      <span className="text-gray-400 truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Printer tip */}
              <div className="bg-surface-dark rounded-lg p-3 border border-border">
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t("labels.printerTip")}
                  <br /><br />
                  <span className="text-brand-500 font-medium">Tip for Color Themes:</span> Make sure to enable <b>"Background graphics"</b> in your browser&apos;s Print dialog to print colors and patterns!
                </p>
              </div>
            </div>

            {/* Right: A4 Preview */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold mb-2 self-start" style={{ color: "var(--text-muted)" }}>{t("labels.preview")}</h3>

              {/* A4 sheet preview */}
              <div
                className="bg-white rounded-lg shadow-lg overflow-hidden"
                style={{
                  width: a4WidthPx * previewScale,
                  height: a4HeightPx * previewScale,
                  position: "relative",
                }}
              >
                {currentPage.map((asset, cellIdx) => {
                  const row = Math.floor(cellIdx / layout.cols);
                  const col = cellIdx % layout.cols;
                  const left = layout.marginLeftMm + col * (layout.labelWidthMm + layout.gapXMm);
                  const top = layout.marginTopMm + row * (layout.labelHeightMm + layout.gapYMm);

                  return (
                    <div
                      key={cellIdx}
                      style={{
                        position: "absolute",
                        left: mmToPx(left) * previewScale,
                        top: mmToPx(top) * previewScale,
                        width: mmToPx(layout.labelWidthMm) * previewScale,
                        height: mmToPx(layout.labelHeightMm) * previewScale,
                        overflow: "hidden",
                        boxSizing: "border-box",
                        border: showCutLines ? `1px solid ${CUT_LINE_COLOR}` : "none",
                      }}
                    >
                      {asset ? (
                        <LabelTemplate
                          asset={asset}
                          template={effectiveTemplate}
                          widthMm={layout.labelWidthMm}
                          heightMm={layout.labelHeightMm}
                          scale={previewScale}
                          showBorder={!showCutLines}
                          logoSrc={logoSrc}
                          colorTheme={colorTheme}
                        />
                      ) : !showCutLines ? (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "1px dashed #ddd",
                            borderRadius: 2,
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                    disabled={previewPage === 0}
                    className="w-8 h-8 rounded-lg border border-border bg-surface-dark hover:bg-surface flex items-center justify-center transition disabled:opacity-30" style={{ color: "var(--text-muted)" }}
                  >
                    ‹
                  </button>
                  <span className="text-sm text-gray-400 font-mono">
                    {previewPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPreviewPage(Math.min(totalPages - 1, previewPage + 1))}
                    disabled={previewPage >= totalPages - 1}
                    className="w-8 h-8 rounded-lg border border-border bg-surface-dark hover:bg-surface flex items-center justify-center transition disabled:opacity-30" style={{ color: "var(--text-muted)" }}
                  >
                    ›
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">A4 (210 × 297 mm)</p>
            </div>
          </div>
        </div>

        {/* Hidden full-size print area — all pages rendered at actual size */}
        <div className="sr-only" ref={printRef}>
          {pages.map((pageAssets, pageIdx) => (
            <div
              key={pageIdx}
              className="a4-page"
              style={{
                position: "relative",
                width: `210mm`,
                height: `297mm`,
              }}
            >
              {pageAssets.map((asset, cellIdx) => {
                const row = Math.floor(cellIdx / layout.cols);
                const col = cellIdx % layout.cols;
                const left = layout.marginLeftMm + col * (layout.labelWidthMm + layout.gapXMm);
                const top = layout.marginTopMm + row * (layout.labelHeightMm + layout.gapYMm);

                return (
                  <div
                    key={cellIdx}
                    className="label-cell"
                    style={{
                      position: "absolute",
                      left: `${left}mm`,
                      top: `${top}mm`,
                      width: `${layout.labelWidthMm}mm`,
                      height: `${layout.labelHeightMm}mm`,
                      overflow: "hidden",
                    }}
                  >
                    {asset && (
                      <LabelTemplate
                        asset={asset}
                        template={effectiveTemplate}
                        widthMm={layout.labelWidthMm}
                        heightMm={layout.labelHeightMm}
                        scale={1}
                        showBorder={false}
                        logoSrc={logoSrc}
                        colorTheme={colorTheme}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
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
            {t("labels.printAll")} ({totalLabels} {t("labels.items")})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function NumberField({
  label, value, min, max, step, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (Number.isNaN(raw)) return;
          onChange(Math.max(min, Math.min(max, raw)));
        }}
        className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border font-mono text-sm focus:border-brand-500 focus:outline-none transition"
        style={{ color: "var(--text-default)" }}
      />
    </label>
  );
}
