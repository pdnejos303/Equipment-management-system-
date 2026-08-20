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
}

export function BarcodeDisplay({ value, text, height = 40, width = 2, fontSize = 12 }: Props) {
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
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [value, text, height, width, fontSize]);

  return <svg ref={svgRef} />;
}
