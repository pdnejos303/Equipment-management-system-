// Path: src/components/AssetSticker.tsx
// ============================================================
// File: AssetSticker.tsx
// Path: equip-track/src/components/AssetSticker.tsx
// Desc: สติกเกอร์สำหรับพิมพ์ติดอุปกรณ์ (enhanced version)
//       รองรับเลือกขนาด, template, และพิมพ์ผ่านเครื่องพิมพ์สติกเกอร์เฉพาะทาง
//       ใช้ LabelPrintDialog สำหรับตั้งค่าการพิมพ์ละเอียด
// ============================================================

"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LabelPrintDialog } from "./labels/LabelPrintDialog";
import { LabelTemplate } from "./labels/LabelTemplate";
import type { LabelAsset } from "./labels/label-config";

interface AssetStickerProps {
  code: string;
  name: string;
  brand?: string;
  model?: string;
  serial?: string;
}

export function AssetSticker({
  code,
  name,
  brand,
  model,
  serial,
}: AssetStickerProps) {
  const { t } = useI18n();
  const [showDialog, setShowDialog] = useState(false);

  const asset: LabelAsset = { id: code, code, name, brand, model, serial };

  const handleQuickPrint = () => {
    // Quick print: open print dialog directly with 80×50mm thermal size
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const container = document.getElementById("sticker-print-area");
    if (!container) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${code} - Label</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm 50mm; margin: 0; }
    body { font-family: 'Sarabun', sans-serif; width: 80mm; height: 50mm; }
    .label-template-root > div { border: none !important; }
  </style>
</head>
<body>${container.innerHTML}</body>
<script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)};</script>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t("labels.preview")}</h3>
        <div className="bg-gray-100 rounded-xl p-6 inline-block">
          <div id="sticker-print-area">
            <LabelTemplate
              asset={asset}
              template="compact"
              widthMm={80}
              heightMm={50}
              scale={1.1}
              showBorder
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">80 × 50 mm ({t("labels.defaultSize")})</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Quick print (80×50 thermal) */}
        <button
          onClick={handleQuickPrint}
          className="flex-1 bg-amber-500 text-black font-semibold py-2.5 px-4 rounded-lg hover:bg-amber-400 transition flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t("labels.quickPrint")}
        </button>

        {/* Advanced print settings */}
        <button
          onClick={() => setShowDialog(true)}
          className="flex-1 bg-surface border border-border text-gray-300 font-semibold py-2.5 px-4 rounded-lg hover:bg-surface-dark hover:border-gray-600 transition flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t("labels.advancedPrint")}
        </button>
      </div>

      {/* Print dialog */}
      <LabelPrintDialog
        asset={asset}
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </div>
  );
}
