// Path: src/components/BarcodeDisplay.tsx
"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  text?: string;
  height?: number;
  width?: number;
  fontSize?: number;
  fgColor?: string;
  bgColor?: string;
}

export function BarcodeDisplay({ value, text, height = 40, width = 2, fontSize = 12, fgColor = "#000000", bgColor = "transparent" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          text: text,
          fontSize,
          margin: 5,
          lineColor: fgColor,
          background: bgColor,
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [value, text, height, width, fontSize]);

  return <svg ref={svgRef} />;
}
