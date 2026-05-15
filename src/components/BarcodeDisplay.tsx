// Path: src/components/BarcodeDisplay.tsx
"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
}

export function BarcodeDisplay({ value, height = 40, width = 2, fontSize = 12 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 5,
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [value, height, width, fontSize]);

  return <svg ref={svgRef} />;
}
