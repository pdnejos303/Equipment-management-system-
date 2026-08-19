// Path: src/lib/codes.ts
// ============================================================
// File: codes.ts
// Path: equip-track/src/lib/codes.ts
// Desc: QR Code + Barcode generation สำหรับพิมพ์สติกเกอร์ติดอุปกรณ์
//       ใช้ qrcode (SVG/DataURL) + JsBarcode (Code128)
// ============================================================

import QRCode from "qrcode";

/**
 * สร้าง QR Code เป็น Data URL (base64 PNG)
 * ใช้กับ <img src={...} />
 */
export async function generateQRDataURL(
  text: string,
  size: number = 200
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

/**
 * สร้าง QR Code เป็น SVG string
 * ใช้สำหรับ server-side render หรือ PDF export
 */
export async function generateQRSVG(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

/**
 * สร้าง URL ที่ QR Code จะ point ไป เมื่อสแกน
 * เช่น https://equip.yourdomain.com/asset/EQ-001
 *
 * Browser: ใช้ window.location.origin → ใช้โดเมน/IP เดียวกับที่เปิดเว็บอยู่
 *          ทำให้ deploy ที่ไหนก็ได้โดยไม่ต้อง rebuild image
 * Server:  fallback ไปที่ env var (สำหรับ SSR/print PDF ในอนาคต)
 */
export function getAssetURL(assetCode: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    // If envUrl is set, we use it to allow forcing a specific domain for QR codes
    // (e.g. forcing a local IP address even if viewing on localhost)
    // If not, we dynamically use the current browser's origin.
    if (envUrl && envUrl !== "http://localhost:3000" && envUrl !== "http://localhost:3003") {
        return `${envUrl}/asset/${assetCode}`;
    }
    return `${origin}/asset/${assetCode}`;
  }
  
  return `${envUrl || "http://localhost:3003"}/asset/${assetCode}`;
}

/**
 * สร้าง Barcode เป็น SVG (ใช้ JsBarcode ฝั่ง client)
 *
 * ใช้ใน component แบบนี้:
 *
 * ```tsx
 * import JsBarcode from "jsbarcode";
 * import { useEffect, useRef } from "react";
 *
 * function BarcodeDisplay({ value }: { value: string }) {
 *   const svgRef = useRef<SVGSVGElement>(null);
 *   useEffect(() => {
 *     if (svgRef.current) {
 *       JsBarcode(svgRef.current, value, {
 *         format: "CODE128",
 *         width: 2,
 *         height: 40,
 *         displayValue: true,
 *         fontSize: 12,
 *         margin: 5,
 *       });
 *     }
 *   }, [value]);
 *   return <svg ref={svgRef} />;
 * }
 * ```
 */

// ── Sticker Label Data ──

export interface StickerData {
  code: string;
  name: string;
  brand?: string;
  model?: string;
  serial?: string;
  qrDataUrl: string;
}

/**
 * สร้างข้อมูลสำหรับพิมพ์สติกเกอร์
 */
export async function generateStickerData(asset: {
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
}): Promise<StickerData> {
  const url = getAssetURL(asset.code);
  const qrDataUrl = await generateQRDataURL(url, 150);

  return {
    code: asset.code,
    name: asset.name,
    brand: asset.brand || undefined,
    model: asset.model || undefined,
    serial: asset.serialNumber || undefined,
    qrDataUrl,
  };
}
