// Path: src/components/labels/LabelTemplate.tsx
// ============================================================
// File: LabelTemplate.tsx
// Path: equip-track/src/components/labels/LabelTemplate.tsx
// Desc: Renders a single label at any size with different templates
//       Pure white-on-black print-optimized rendering
// ============================================================

"use client";

import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { BarcodeDisplay } from "@/components/BarcodeDisplay";
import type { LabelAsset, LabelTemplateType } from "./label-config";
import { mmToPx } from "./label-config";

interface Props {
  asset: LabelAsset;
  template: LabelTemplateType;
  widthMm: number;
  heightMm: number;
  /** scale factor for preview (1 = actual size) */
  scale?: number;
  showBorder?: boolean;
  /** optional brand logo (base64 data URL) shown small in the bottom-left corner */
  logoSrc?: string | null;
}

export function LabelTemplate({
  asset,
  template,
  widthMm,
  heightMm,
  scale = 1,
  showBorder = true,
  logoSrc,
}: Props) {
  const wPx = mmToPx(widthMm);
  const hPx = mmToPx(heightMm);

  // Calculate dynamic sizes based on label dimensions
  const isSmall = widthMm <= 50 || heightMm <= 30;
  const isTiny = widthMm <= 40 || heightMm <= 25;

  // Logo sizing: small mark capped at ~5mm or ~16% of label height.
  const logoMaxPx = Math.min(mmToPx(5), mmToPx(heightMm * 0.16));
  const showLogo = !!logoSrc && logoMaxPx >= mmToPx(2.5);

  const qrSize = isTiny
    ? Math.min(mmToPx(heightMm * 0.65), mmToPx(15))
    : isSmall
    ? Math.min(mmToPx(heightMm * 0.6), mmToPx(20))
    : Math.min(mmToPx(heightMm * 0.55), mmToPx(25));

  const padding = isTiny ? mmToPx(1.5) : isSmall ? mmToPx(2) : mmToPx(3);

  return (
    <div
      className="label-template-root"
      style={{
        width: wPx * scale,
        height: hPx * scale,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: wPx,
          height: hPx,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: "#ffffff",
          color: "#000000",
          fontFamily: "'Sarabun', 'Inter', sans-serif",
          padding,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          border: showBorder ? "1px solid #ccc" : "none",
          position: "relative",
        }}
      >
        {template === "full" && (
          <FullTemplate
            asset={asset}
            qrSize={qrSize}
            isSmall={isSmall}
            isTiny={isTiny}
            heightMm={heightMm}
          />
        )}
        {template === "compact" && (
          <CompactTemplate
            asset={asset}
            qrSize={qrSize}
            isSmall={isSmall}
            isTiny={isTiny}
          />
        )}
        {template === "qr-only" && (
          <QROnlyTemplate
            asset={asset}
            widthMm={widthMm}
            heightMm={heightMm}
          />
        )}
        {template === "barcode-only" && (
          <BarcodeOnlyTemplate
            asset={asset}
            widthMm={widthMm}
            heightMm={heightMm}
            isTiny={isTiny}
          />
        )}

        {showLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc!}
            alt=""
            style={{
              position: "absolute",
              left: padding,
              bottom: padding,
              maxHeight: logoMaxPx,
              maxWidth: logoMaxPx * 3,
              objectFit: "contain",
              background: "#ffffff",
              padding: 0.5,
              borderRadius: 1,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Full Template: QR + Barcode + All info ──

function FullTemplate({
  asset,
  qrSize,
  isSmall,
  isTiny,
  heightMm,
}: {
  asset: LabelAsset;
  qrSize: number;
  isSmall: boolean;
  isTiny: boolean;
  heightMm: number;
}) {
  const codeFontSize = isTiny ? 10 : isSmall ? 12 : 15;
  const nameFontSize = isTiny ? 8 : isSmall ? 9 : 11;
  const metaFontSize = isTiny ? 7 : isSmall ? 7 : 9;
  const footerFontSize = isTiny ? 5 : isSmall ? 6 : 7;
  const barcodeHeight = isTiny ? 16 : isSmall ? 20 : 28;
  const barcodeWidth = isTiny ? 1 : isSmall ? 1.2 : 1.5;
  const barcodeFontSize = isTiny ? 7 : isSmall ? 8 : 9;

  return (
    <>
      {/* Top section: info + QR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: "0 0 auto", gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: codeFontSize, fontWeight: 800, letterSpacing: "0.03em", lineHeight: 1.2 }}>
            {asset.code}
          </div>
          <div style={{ fontSize: nameFontSize, fontWeight: 600, lineHeight: 1.2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {asset.name}
          </div>
          {asset.brand && (
            <div style={{ fontSize: metaFontSize, color: "#555", lineHeight: 1.2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {asset.brand} {asset.model}
            </div>
          )}
          {asset.serial && !isTiny && (
            <div style={{ fontSize: metaFontSize - 1, color: "#888", fontFamily: "monospace", lineHeight: 1.2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              S/N: {asset.serial}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          <QRCodeDisplay assetCode={asset.code} size={qrSize} />
        </div>
      </div>

      {/* Barcode section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", minHeight: 0 }}>
        <div style={{ transform: "scale(0.9)", transformOrigin: "center bottom" }}>
          <BarcodeDisplay value={asset.code} text={`${asset.code} - ${asset.name}`} height={barcodeHeight} width={barcodeWidth} fontSize={barcodeFontSize} />
        </div>
      </div>

      {/* Footer */}
      {heightMm >= 35 && (
        <div style={{ fontSize: footerFontSize, color: "#aaa", textAlign: "center", marginTop: 1, lineHeight: 1 }}>
          Scan to view • Asset Management
        </div>
      )}
    </>
  );
}

// ── Compact Template: QR + code + name ──

function CompactTemplate({
  asset,
  qrSize,
  isSmall,
  isTiny,
}: {
  asset: LabelAsset;
  qrSize: number;
  isSmall: boolean;
  isTiny: boolean;
}) {
  const codeFontSize = isTiny ? 10 : isSmall ? 13 : 16;
  const nameFontSize = isTiny ? 8 : isSmall ? 9 : 11;
  const metaFontSize = isTiny ? 7 : isSmall ? 8 : 9;

  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", gap: isTiny ? 4 : 8 }}>
      <div style={{ flexShrink: 0 }}>
        <QRCodeDisplay assetCode={asset.code} size={qrSize * 1.15} />
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <div style={{ fontSize: codeFontSize, fontWeight: 800, letterSpacing: "0.03em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {asset.name}
        </div>
        {(asset.brand || asset.model) && (
          <div style={{ fontSize: nameFontSize, fontWeight: 600, lineHeight: 1.2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {asset.brand} {asset.model}
          </div>
        )}
        {asset.serial && (
          <div style={{ fontSize: metaFontSize, color: "#666", lineHeight: 1.2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            SN: {asset.serial}
          </div>
        )}
      </div>
    </div>
  );
}

// ── QR Only Template ──

function QROnlyTemplate({
  asset,
  widthMm,
  heightMm,
}: {
  asset: LabelAsset;
  widthMm: number;
  heightMm: number;
}) {
  const minDim = Math.min(widthMm, heightMm);
  const qrSize = mmToPx(minDim * 0.7);
  const fontSize = minDim <= 30 ? 8 : 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <QRCodeDisplay assetCode={asset.code} size={qrSize} />
      <div style={{ fontSize, fontWeight: 700, marginTop: 3, textAlign: "center", letterSpacing: "0.05em" }}>
        {asset.code}
      </div>
    </div>
  );
}

// ── Barcode Only Template ──

function BarcodeOnlyTemplate({
  asset,
  widthMm,
  heightMm,
  isTiny,
}: {
  asset: LabelAsset;
  widthMm: number;
  heightMm: number;
  isTiny: boolean;
}) {
  const barcodeHeight = isTiny ? mmToPx(heightMm * 0.45) : mmToPx(heightMm * 0.5);
  const barcodeWidth = widthMm <= 50 ? 1.2 : 1.8;
  const barcodeFontSize = isTiny ? 8 : 10;
  const nameFontSize = isTiny ? 7 : 9;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2 }}>
      <div style={{ fontSize: nameFontSize, fontWeight: 600, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
        {asset.name}
      </div>
      <BarcodeDisplay value={asset.code} text={`${asset.code} - ${asset.name}`} height={barcodeHeight} width={barcodeWidth} fontSize={barcodeFontSize} />
    </div>
  );
}
