// Path: src/components/labels/label-config.ts
// ============================================================
// File: label-config.ts
// Path: equip-track/src/components/labels/label-config.ts
// Desc: Label printing configuration — sizes, templates, A4 layouts
// ============================================================

// ── Label Size Presets (for thermal/dedicated label printers) ──

export interface LabelSize {
  id: string;
  name: string;      // i18n key
  widthMm: number;
  heightMm: number;
  description: string; // i18n key
}

export const LABEL_SIZES: LabelSize[] = [
  { id: "80x50",  name: "labels.size.80x50",  widthMm: 80,  heightMm: 50,  description: "labels.sizeDesc.80x50" },
  { id: "70x40",  name: "labels.size.70x40",  widthMm: 70,  heightMm: 40,  description: "labels.sizeDesc.70x40" },
  { id: "62x29",  name: "labels.size.62x29",  widthMm: 62,  heightMm: 29,  description: "labels.sizeDesc.62x29" },
  { id: "50x30",  name: "labels.size.50x30",  widthMm: 50,  heightMm: 30,  description: "labels.sizeDesc.50x30" },
  { id: "50x25",  name: "labels.size.50x25",  widthMm: 50,  heightMm: 25,  description: "labels.sizeDesc.50x25" },
  { id: "40x30",  name: "labels.size.40x30",  widthMm: 40,  heightMm: 30,  description: "labels.sizeDesc.40x30" },
];

// ── Label Templates ──

export type LabelTemplateType = "full" | "compact" | "qr-only" | "barcode-only";

export interface LabelTemplateOption {
  id: LabelTemplateType;
  name: string;   // i18n key
  description: string; // i18n key
  minWidthMm: number;  // minimum label width that supports this template
  minHeightMm: number;
}

export const LABEL_TEMPLATES: LabelTemplateOption[] = [
  { id: "full",         name: "labels.template.full",     description: "labels.templateDesc.full",     minWidthMm: 50, minHeightMm: 30 },
  { id: "compact",      name: "labels.template.compact",  description: "labels.templateDesc.compact",  minWidthMm: 40, minHeightMm: 25 },
  { id: "qr-only",      name: "labels.template.qrOnly",   description: "labels.templateDesc.qrOnly",   minWidthMm: 25, minHeightMm: 25 },
  { id: "barcode-only", name: "labels.template.barcodeOnly", description: "labels.templateDesc.barcodeOnly", minWidthMm: 40, minHeightMm: 15 },
];

// ── A4 Sheet Layouts (for printing multiple labels on standard paper) ──

export interface A4SheetLayout {
  id: string;
  name: string;      // i18n key
  description: string; // i18n key
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
}

// A4 = 210×297mm
export const A4_LAYOUTS: A4SheetLayout[] = [
  {
    id: "3x7",  name: "labels.a4.3x7",  description: "labels.a4Desc.3x7",
    cols: 3, rows: 7, labelWidthMm: 63.5, labelHeightMm: 38.1,
    marginTopMm: 6, marginLeftMm: 7.2, gapXMm: 2.5, gapYMm: 0,
  },
  {
    id: "3x8",  name: "labels.a4.3x8",  description: "labels.a4Desc.3x8",
    cols: 3, rows: 8, labelWidthMm: 63.5, labelHeightMm: 33.9,
    marginTopMm: 4.6, marginLeftMm: 7.2, gapXMm: 2.5, gapYMm: 0,
  },
  {
    id: "4x10", name: "labels.a4.4x10", description: "labels.a4Desc.4x10",
    cols: 4, rows: 10, labelWidthMm: 48.5, labelHeightMm: 25.4,
    marginTopMm: 22, marginLeftMm: 8, gapXMm: 0, gapYMm: 0,
  },
  {
    id: "2x5",  name: "labels.a4.2x5",  description: "labels.a4Desc.2x5",
    cols: 2, rows: 5, labelWidthMm: 99.1, labelHeightMm: 57,
    marginTopMm: 3.5, marginLeftMm: 5.9, gapXMm: 0, gapYMm: 0,
  },
  {
    id: "2x7",  name: "labels.a4.2x7",  description: "labels.a4Desc.2x7",
    cols: 2, rows: 7, labelWidthMm: 99.1, labelHeightMm: 38.1,
    marginTopMm: 10.5, marginLeftMm: 5.9, gapXMm: 0, gapYMm: 0,
  },
];

// ── Asset data interface for labels ──

export interface LabelAsset {
  id: string;
  code: string;
  name: string;
  brand?: string;
  model?: string;
  serial?: string;
}

// ── Helpers ──

/** Convert mm to CSS pixels (for screen preview, roughly 96dpi) */
export function mmToPx(mm: number): number {
  return Math.round(mm * 3.7795275591);
}

// ── Cut lines (crop guides for DIY cutting) ──────────────────
// Thin grid border drawn around every cell so sheets can be cut evenly.
export const CUT_LINE_COLOR = "#999999";
export const CUT_LINE_WIDTH_MM = 0.2;

// ── Brand logo (optional, persisted in localStorage) ─────────
// Stored as a base64 data URL so it survives reloads with no backend.
export const LABEL_LOGO_KEY = "equiptrack.labelLogo";

/** Read the saved label logo (base64 data URL) from localStorage. */
export function getSavedLogo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LABEL_LOGO_KEY);
  } catch {
    return null;
  }
}

/** Save (or clear, when passed null) the label logo in localStorage. */
export function setSavedLogo(dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl) window.localStorage.setItem(LABEL_LOGO_KEY, dataUrl);
    else window.localStorage.removeItem(LABEL_LOGO_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Get compatible templates for a given label size */
export function getCompatibleTemplates(widthMm: number, heightMm: number): LabelTemplateOption[] {
  return LABEL_TEMPLATES.filter(
    (t) => widthMm >= t.minWidthMm && heightMm >= t.minHeightMm
  );
}

/** Calculate how many labels fit in the A4 layout */
export function getLabelsPerSheet(layout: A4SheetLayout): number {
  return layout.cols * layout.rows;
}

/** Calculate total pages needed */
export function getTotalPages(assetCount: number, layout: A4SheetLayout): number {
  return Math.ceil(assetCount / getLabelsPerSheet(layout));
}

// ── Custom layout (user-defined) ─────────────────────────────
// A4 = 210 × 297 mm. Build a layout by distributing available space
// across `cols` × `rows`, minus page margins and inter-label gaps.

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const CUSTOM_LAYOUT_ID = "custom";

export interface CustomLayoutConfig {
  cols: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
}

export const DEFAULT_CUSTOM_LAYOUT: CustomLayoutConfig = {
  cols: 4,
  rows: 5,
  marginTopMm: 8,
  marginLeftMm: 8,
  gapXMm: 2,
  gapYMm: 2,
};

/** Build an A4SheetLayout where label size is derived from page dims minus margins + gaps. */
export function buildCustomLayout(cfg: CustomLayoutConfig): A4SheetLayout {
  const cols = Math.max(1, Math.min(10, Math.floor(cfg.cols)));
  const rows = Math.max(1, Math.min(20, Math.floor(cfg.rows)));
  const marginLeft = Math.max(0, cfg.marginLeftMm);
  const marginTop = Math.max(0, cfg.marginTopMm);
  const gapX = Math.max(0, cfg.gapXMm);
  const gapY = Math.max(0, cfg.gapYMm);

  const usableW = A4_WIDTH_MM - marginLeft * 2 - gapX * (cols - 1);
  const usableH = A4_HEIGHT_MM - marginTop * 2 - gapY * (rows - 1);
  const labelWidthMm = Math.max(5, usableW / cols);
  const labelHeightMm = Math.max(5, usableH / rows);

  return {
    id: CUSTOM_LAYOUT_ID,
    name: "labels.a4.custom",
    description: "labels.a4Desc.custom",
    cols,
    rows,
    labelWidthMm: Math.round(labelWidthMm * 10) / 10,
    labelHeightMm: Math.round(labelHeightMm * 10) / 10,
    marginTopMm: marginTop,
    marginLeftMm: marginLeft,
    gapXMm: gapX,
    gapYMm: gapY,
  };
}
