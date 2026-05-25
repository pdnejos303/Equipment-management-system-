// Path: src/app/api/export/audit/route.ts
// ============================================================
// Desc: Physical-audit checklist (printable HTML).
//       Each row: QR + asset info + checkboxes (Found / Missing /
//       Condition issue) + note line. Header has signature/date
//       fields for the auditor and supervisor.
//
//       Query params (all optional, mirrors /api/export):
//         ?lang=th|en|ja
//         &category=LAPTOP
//         &status=ACTIVE
//         &location=Office
//         &asOf=YYYY-MM-DD
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQRSVG, getAssetURL } from "@/lib/codes";
import { htmlToPdf } from "@/lib/pdf";
import { format } from "date-fns";
import { th, enUS, ja } from "date-fns/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lang = "th" | "en" | "ja";

const DATE_LOCALES = { th, en: enUS, ja };

const STRINGS: Record<Lang, Record<string, string>> = {
  th: {
    title: "ใบเดินนับทรัพย์สิน (Physical Audit Checklist)",
    auditor: "ผู้ตรวจนับ",
    supervisor: "ผู้ควบคุม / ผู้อนุมัติ",
    date: "วันที่ตรวจ",
    department: "แผนก / สาขา",
    signature: "ลายเซ็น",
    asOf: "ข้อมูล ณ วันที่",
    items: "รายการ",
    code: "รหัส",
    asset: "อุปกรณ์",
    serial: "S/N",
    expectedUser: "ผู้ครอบครอง",
    expectedLocation: "สถานที่",
    found: "พบ",
    missing: "หาย",
    issue: "ชำรุด",
    note: "หมายเหตุ",
    summary: "สรุป",
    totalChecked: "ตรวจ ___ / {0} รายการ",
    foundCount: "พบ ___",
    missingCount: "หาย ___",
    issueCount: "ชำรุด ___",
    printHint: "กด Ctrl+P (หรือ ⌘+P) เพื่อพิมพ์ / Save as PDF",
  },
  en: {
    title: "Physical Audit Checklist",
    auditor: "Auditor",
    supervisor: "Supervisor / Approver",
    date: "Audit date",
    department: "Department / Site",
    signature: "Signature",
    asOf: "Data as of",
    items: "items",
    code: "Code",
    asset: "Asset",
    serial: "S/N",
    expectedUser: "Assigned to",
    expectedLocation: "Location",
    found: "Found",
    missing: "Missing",
    issue: "Issue",
    note: "Note",
    summary: "Summary",
    totalChecked: "Checked ___ / {0} items",
    foundCount: "Found ___",
    missingCount: "Missing ___",
    issueCount: "Issue ___",
    printHint: "Press Ctrl+P (or ⌘+P) to print / Save as PDF",
  },
  ja: {
    title: "実地棚卸チェックリスト",
    auditor: "棚卸担当者",
    supervisor: "監督者 / 承認者",
    date: "棚卸日",
    department: "部門 / 拠点",
    signature: "署名",
    asOf: "基準日",
    items: "件",
    code: "コード",
    asset: "資産",
    serial: "S/N",
    expectedUser: "使用者",
    expectedLocation: "場所",
    found: "有",
    missing: "不明",
    issue: "破損",
    note: "備考",
    summary: "集計",
    totalChecked: "確認 ___ / {0} 件",
    foundCount: "有 ___",
    missingCount: "不明 ___",
    issueCount: "破損 ___",
    printHint: "Ctrl+P（または⌘+P）で印刷 / PDFとして保存",
  },
};

function buildFilters(url: URL) {
  const category = url.searchParams.get("category") || "";
  const status = url.searchParams.get("status") || "";
  const location = url.searchParams.get("location") || "";
  const asOfRaw = url.searchParams.get("asOf") || "";

  let asOf: Date = new Date();
  if (asOfRaw) {
    const d = new Date(asOfRaw);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      asOf = d;
    }
  }

  const where: any = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (location) where.location = { contains: location };
  if (asOfRaw) where.purchaseDate = { lte: asOf };

  return { where, asOf, asOfRaw };
}

function esc(v: string | null | undefined): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const lang = (url.searchParams.get("lang") as Lang) || "th";
    const s = STRINGS[lang] || STRINGS.th;
    const dateFnsLocale = DATE_LOCALES[lang] || DATE_LOCALES.th;
    const { where, asOf, asOfRaw } = buildFilters(url);
    const wantPdf = url.searchParams.get("pdf") === "1";

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignments: {
          where: { dateIn: null },
          take: 1,
          select: { personName: true, department: true },
        },
      },
      orderBy: [{ location: "asc" }, { code: "asc" }],
    });

    // QR generation in parallel
    const qrSvgs = await Promise.all(
      assets.map((a) => generateQRSVG(getAssetURL(a.code)).catch(() => ""))
    );

    const rowsHtml = assets
      .map((a, i) => {
        const assigned = a.assignments[0];
        const who = assigned ? assigned.personName : "—";
        const dept = assigned?.department ? ` (${esc(assigned.department)})` : "";
        const meta = [a.brand, a.model].filter(Boolean).join(" ");
        return `
          <tr>
            <td class="qr">${qrSvgs[i]}</td>
            <td class="code">${esc(a.code)}</td>
            <td class="asset">
              <div class="asset-name">${esc(a.name)}</div>
              ${meta ? `<div class="asset-meta">${esc(meta)}</div>` : ""}
              ${a.serialNumber ? `<div class="asset-sn">S/N: ${esc(a.serialNumber)}</div>` : ""}
            </td>
            <td class="who">${esc(who)}${dept}</td>
            <td class="loc">${esc(a.location || "—")}</td>
            <td class="chk"><div class="box"></div></td>
            <td class="chk"><div class="box"></div></td>
            <td class="chk"><div class="box"></div></td>
            <td class="note"></td>
          </tr>
        `;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${esc(s.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 12mm 10mm; }
    body { font-family: 'Sarabun', 'Noto Sans JP', sans-serif; color: #111; font-size: 11px; padding: 16px; }

    h1 { font-size: 16px; margin-bottom: 2px; }
    .meta { color: #666; font-size: 10px; margin-bottom: 12px; }

    .header-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      background: #fafafa;
    }
    .header-grid .field { font-size: 10px; }
    .header-grid .field .label { color: #888; text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px; }
    .header-grid .field .line {
      border-bottom: 1px solid #999;
      height: 22px;
      margin-top: 2px;
    }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 5px 6px; vertical-align: middle; }
    th {
      background: #f0f0f0;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: left;
    }
    th.chk-h, td.chk { width: 38px; text-align: center; }
    th.qr-h, td.qr { width: 52px; text-align: center; }
    th.code-h, td.code { width: 70px; font-family: ui-monospace, Menlo, monospace; font-weight: 600; }
    th.who-h, td.who { width: 130px; font-size: 10px; }
    th.loc-h, td.loc { width: 110px; font-size: 10px; }
    th.note-h, td.note { width: 170px; }

    td.qr svg { width: 44px; height: 44px; display: block; margin: 0 auto; }
    .asset-name { font-weight: 600; font-size: 11px; }
    .asset-meta { color: #666; font-size: 9.5px; margin-top: 1px; }
    .asset-sn { color: #888; font-size: 9px; font-family: ui-monospace, Menlo, monospace; margin-top: 1px; }

    .box {
      width: 14px; height: 14px; border: 1.5px solid #555;
      border-radius: 2px; margin: 0 auto;
    }

    tbody tr { page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #fbfbfb; }

    .summary {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
    }
    .summary .item { font-size: 10px; }
    .summary .item .label { color: #888; font-size: 9px; text-transform: uppercase; }
    .summary .item .value { font-weight: 700; font-size: 12px; margin-top: 2px; }

    .sign-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .sign-grid .col { font-size: 10px; }
    .sign-grid .col .sig-line {
      border-bottom: 1px solid #333;
      height: 32px;
      margin-bottom: 4px;
    }
    .sign-grid .col .role { color: #888; text-transform: uppercase; font-size: 9px; }
    .sign-grid .col .name-line {
      border-bottom: 1px dotted #999;
      height: 18px;
      margin-top: 10px;
    }

    .print-hint {
      margin-top: 16px;
      text-align: center;
      color: #888;
      font-size: 10px;
    }
    @media print { .print-hint { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${esc(s.title)}</h1>
  <p class="meta">
    ${assets.length} ${esc(s.items)}
    ${asOfRaw ? ` • ${esc(s.asOf)}: ${esc(format(asOf, "d MMM yyyy", { locale: dateFnsLocale }))}` : ""}
  </p>

  <div class="header-grid">
    <div class="field">
      <div class="label">${esc(s.auditor)}</div>
      <div class="line"></div>
    </div>
    <div class="field">
      <div class="label">${esc(s.supervisor)}</div>
      <div class="line"></div>
    </div>
    <div class="field">
      <div class="label">${esc(s.date)} / ${esc(s.department)}</div>
      <div class="line"></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="qr-h">QR</th>
        <th class="code-h">${esc(s.code)}</th>
        <th>${esc(s.asset)}</th>
        <th class="who-h">${esc(s.expectedUser)}</th>
        <th class="loc-h">${esc(s.expectedLocation)}</th>
        <th class="chk-h">${esc(s.found)}</th>
        <th class="chk-h">${esc(s.missing)}</th>
        <th class="chk-h">${esc(s.issue)}</th>
        <th class="note-h">${esc(s.note)}</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="summary">
    <div class="item"><div class="label">${esc(s.summary)}</div><div class="value">${esc(s.totalChecked.replace("{0}", String(assets.length)))}</div></div>
    <div class="item"><div class="label">${esc(s.found)}</div><div class="value">${esc(s.foundCount)}</div></div>
    <div class="item"><div class="label">${esc(s.missing)}</div><div class="value">${esc(s.missingCount)}</div></div>
    <div class="item"><div class="label">${esc(s.issue)}</div><div class="value">${esc(s.issueCount)}</div></div>
  </div>

  <div class="sign-grid">
    <div class="col">
      <div class="sig-line"></div>
      <div class="role">${esc(s.auditor)} — ${esc(s.signature)}</div>
      <div class="name-line"></div>
      <div class="role" style="margin-top:2px">${esc(s.date)}</div>
    </div>
    <div class="col">
      <div class="sig-line"></div>
      <div class="role">${esc(s.supervisor)} — ${esc(s.signature)}</div>
      <div class="name-line"></div>
      <div class="role" style="margin-top:2px">${esc(s.date)}</div>
    </div>
  </div>

  <p class="print-hint">${esc(s.printHint)}</p>
  ${wantPdf ? "" : `<script>setTimeout(function(){ try { window.print(); } catch(e){} }, 400);</script>`}
</body>
</html>`;

    if (wantPdf) {
      const pdf = await htmlToPdf(html, { format: "A4", landscape: true });
      const stamp = asOfRaw ? format(asOf, "yyyyMMdd") : format(new Date(), "yyyyMMdd");
      return new NextResponse(new Blob([pdf], { type: "application/pdf" }), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="audit_${stamp}.pdf"`,
        },
      });
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("GET /api/export/audit error:", error);
    return NextResponse.json({ error: "Audit export failed" }, { status: 500 });
  }
}
