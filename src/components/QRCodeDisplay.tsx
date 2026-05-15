// Path: src/components/QRCodeDisplay.tsx
"use client";

import { useEffect, useState } from "react";
import { getAssetURL } from "@/lib/codes";

interface Props {
  assetCode: string;
  size?: number;
}

export function QRCodeDisplay({ assetCode, size = 120 }: Props) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    async function generate() {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = getAssetURL(assetCode);
        const dataUrl = await QRCode.toDataURL(url, {
          width: size,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        setSrc(dataUrl);
      } catch (err) {
        console.error("QR generation failed:", err);
      }
    }
    generate();
  }, [assetCode, size]);

  if (!src) return <div style={{ width: size, height: size }} className="bg-gray-200 rounded animate-pulse" />;

  return <img src={src} alt={`QR ${assetCode}`} width={size} height={size} />;
}
