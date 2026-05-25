// Path: src/app/api/export/route.ts
// ============================================================
// File: route.ts
// Path: equip-track/src/app/api/export/route.ts
// Desc: Export assets — CSV (Excel-compatible) + HTML (PDF printable)
//       ?format=csv&lang=th  → download CSV file
//       ?format=json&lang=en → JSON data
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { htmlToPdf } from "@/lib/pdf";
import { format } from "date-fns";
import { th, enUS, ja } from "date-fns/locale";

// Puppeteer needs the Node runtime (not edge)
export const runtime = "nodejs";

export const dynamic = "force-dynamic";

type Lang = "th" | "en" | "ja";

const DATE_LOCALES = { th, en: enUS, ja };

const exportStrings: Record<Lang, Record<string, string>> = {
  th: {
    code: "รหัส", name: "ชื่อ", brand: "ยี่ห้อ", model: "รุ่น",
    serialNumber: "Serial Number", category: "ประเภท", status: "สถานะ",
    currentUser: "ผู้ใช้ปัจจุบัน", purchaseDate: "วันที่ซื้อ",
    purchasePrice: "ราคาซื้อ", lifeYears: "อายุการใช้งาน_ปี",
    currentValue: "มูลค่าปัจจุบัน", accDeprec: "ค่าเสื่อมสะสม",
    annualDeprec: "ค่าเสื่อมต่อปี", percentUsed: "เปอร์เซ็นต์ใช้งาน",
    totalRepair: "ค่าซ่อมรวม", warrantyEnd: "ประกันหมด", location: "สถานที่",
    reportTitle: "รายงานทะเบียนอุปกรณ์",
    totalPurchase: "ราคาซื้อรวม", depreciationAcc: "ค่าเสื่อมสะสม",
    items: "รายการ", user: "ผู้ใช้", usage: "ใช้งาน", repairCost: "ค่าซ่อม",
    printHint: "กด Ctrl+P (หรือ ⌘+P) เพื่อ Save as PDF",
    statusActive: "ใช้งาน", statusAvailable: "ว่าง", statusMaintenance: "ซ่อม", statusRetired: "เสื่อมสภาพ",
  },
  en: {
    code: "Code", name: "Name", brand: "Brand", model: "Model",
    serialNumber: "Serial Number", category: "Category", status: "Status",
    currentUser: "Current User", purchaseDate: "Purchase Date",
    purchasePrice: "Purchase Price", lifeYears: "Life (Years)",
    currentValue: "Current Value", accDeprec: "Acc. Depreciation",
    annualDeprec: "Annual Depreciation", percentUsed: "% Used",
    totalRepair: "Total Repair", warrantyEnd: "Warranty End", location: "Location",
    reportTitle: "Asset Registry Report",
    totalPurchase: "Total Purchase", depreciationAcc: "Acc. Depreciation",
    items: "items", user: "User", usage: "Usage", repairCost: "Repair Cost",
    printHint: "Press Ctrl+P (or ⌘+P) to Save as PDF",
    statusActive: "Active", statusAvailable: "Available", statusMaintenance: "Maintenance", statusRetired: "Retired",
  },
  ja: {
    code: "コード", name: "名称", brand: "ブランド", model: "モデル",
    serialNumber: "Serial Number", category: "カテゴリ", status: "ステータス",
    currentUser: "現在の使用者", purchaseDate: "購入日",
    purchasePrice: "購入価格", lifeYears: "耐用年数",
    currentValue: "現在価値", accDeprec: "減価償却累計",
    annualDeprec: "年間減価償却", percentUsed: "使用率%",
    totalRepair: "修理費合計", warrantyEnd: "保証期限", location: "場所",
    reportTitle: "機器台帳レポート",
    totalPurchase: "購入価格合計", depreciationAcc: "減価償却累計",
    items: "件", user: "使用者", usage: "使用率", repairCost: "修理費",
    printHint: "Ctrl+P（または⌘+P）でPDFとして保存",
    statusActive: "使用中", statusAvailable: "利用可能", statusMaintenance: "修理中", statusRetired: "廃棄済",
  },
};

function getStatusLabel(status: string, lang: Lang): string {
  const s = exportStrings[lang];
  switch (status) {
    case "ACTIVE": return s.statusActive;
    case "AVAILABLE": return s.statusAvailable;
    case "MAINTENANCE": return s.statusMaintenance;
    case "RETIRED": return s.statusRetired;
    default: return status;
  }
}

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

  return { where, asOf, asOfRaw, hasFilters: !!(category || status || location || asOfRaw) };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fmt = url.searchParams.get("format") || "csv";
    const lang = (url.searchParams.get("lang") as Lang) || "th";
    const s = exportStrings[lang] || exportStrings.th;
    const { where, asOf, asOfRaw } = buildFilters(url);

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignments: { where: { dateIn: null }, take: 1, select: { personName: true } },
        maintenanceRecords: {
          where: asOfRaw ? { date: { lte: asOf } } : undefined,
          select: { cost: true },
        },
      },
      orderBy: { code: "asc" },
    });

    const rows = assets.map((a) => {
      const price = Number(a.purchasePrice);
      const dep = calculateDepreciation(price, a.purchaseDate, a.expectedLife, asOf);
      const totalRepair = a.maintenanceRecords.reduce((sum, m) => sum + Number(m.cost), 0);
      const assigned = a.assignments[0]?.personName || "";

      return {
        [s.code]: a.code,
        [s.name]: a.name,
        [s.brand]: a.brand || "",
        [s.model]: a.model || "",
        [s.serialNumber]: a.serialNumber || "",
        [s.category]: a.category,
        [s.status]: getStatusLabel(a.status, lang),
        [s.currentUser]: assigned,
        [s.purchaseDate]: format(a.purchaseDate, "yyyy-MM-dd"),
        [s.purchasePrice]: price,
        [s.lifeYears]: a.expectedLife,
        [s.currentValue]: Math.round(dep.currentValue),
        [s.accDeprec]: Math.round(dep.totalDepreciation),
        [s.annualDeprec]: Math.round(dep.annualDepreciation),
        [s.percentUsed]: dep.percentUsed,
        [s.totalRepair]: totalRepair,
        [s.warrantyEnd]: a.warrantyEnd ? format(a.warrantyEnd, "yyyy-MM-dd") : "",
        [s.location]: a.location || "",
      };
    });

    if (fmt === "json") {
      return NextResponse.json({ data: rows });
    }

    // CSV with BOM for Excel support
    const BOM = "\uFEFF";
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = String((row as any)[h] ?? "");
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      ),
    ];

    const csv = BOM + csvLines.join("\n");
    const stamp = asOfRaw ? format(asOf, "yyyyMMdd") : format(new Date(), "yyyyMMdd");
    const filename = `equipment_${stamp}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

// ── POST /api/export — Generate simple HTML report (printable as PDF) ──

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const lang = (url.searchParams.get("lang") as Lang) || "th";
    const s = exportStrings[lang] || exportStrings.th;
    const dateFnsLocale = DATE_LOCALES[lang] || DATE_LOCALES.th;
    const { where, asOf, asOfRaw } = buildFilters(url);

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignments: { where: { dateIn: null }, take: 1, select: { personName: true } },
        maintenanceRecords: {
          where: asOfRaw ? { date: { lte: asOf } } : undefined,
          select: { cost: true },
        },
      },
      orderBy: { code: "asc" },
    });

    let totalOriginal = 0;
    let totalCurrent = 0;
    let totalRepair = 0;

    const tableRows = assets.map((a) => {
      const price = Number(a.purchasePrice);
      const dep = calculateDepreciation(price, a.purchaseDate, a.expectedLife, asOf);
      const repair = a.maintenanceRecords.reduce((sum, m) => sum + Number(m.cost), 0);
      totalOriginal += price;
      totalCurrent += dep.currentValue;
      totalRepair += repair;

      return `<tr>
        <td>${a.code}</td>
        <td>${a.name}<br><small style="color:#888">${a.brand || ""} ${a.model || ""}</small></td>
        <td>${a.category}</td>
        <td>${getStatusLabel(a.status, lang)}</td>
        <td>${a.assignments[0]?.personName || "-"}</td>
        <td style="text-align:right">${price.toLocaleString()}</td>
        <td style="text-align:right">${Math.round(dep.currentValue).toLocaleString()}</td>
        <td style="text-align:right">${dep.percentUsed}%</td>
        <td style="text-align:right">${repair.toLocaleString()}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>Asset Management — ${s.reportTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', 'Noto Sans JP', sans-serif; padding: 24px; color: #333; font-size: 12px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #888; font-size: 11px; margin-bottom: 16px; }
    .summary { display: flex; gap: 16px; margin-bottom: 20px; }
    .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 10px 16px; flex: 1; }
    .summary-card .label { font-size: 10px; color: #888; text-transform: uppercase; }
    .summary-card .value { font-size: 18px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f5f5f5; text-align: left; padding: 8px 6px; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px; border-bottom: 1px solid #eee; }
    tr:hover { background: #fafafa; }
    small { font-size: 10px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>📋 ${s.reportTitle}</h1>
  <p class="meta">Asset Management — ${format(asOf, "d MMMM yyyy", { locale: dateFnsLocale })} • ${assets.length} ${s.items}${asOfRaw ? ` • As of ${format(asOf, "yyyy-MM-dd")}` : ""}</p>

  <div class="summary">
    <div class="summary-card"><div class="label">${s.totalPurchase}</div><div class="value">฿${totalOriginal.toLocaleString()}</div></div>
    <div class="summary-card"><div class="label">${s.currentValue}</div><div class="value" style="color:#16a34a">฿${Math.round(totalCurrent).toLocaleString()}</div></div>
    <div class="summary-card"><div class="label">${s.depreciationAcc}</div><div class="value" style="color:#dc2626">฿${Math.round(totalOriginal - totalCurrent).toLocaleString()}</div></div>
    <div class="summary-card"><div class="label">${s.totalRepair}</div><div class="value" style="color:#f59e0b">฿${totalRepair.toLocaleString()}</div></div>
  </div>

  <table>
    <thead><tr>
      <th>${s.code}</th><th>${s.name}</th><th>${s.category}</th><th>${s.status}</th><th>${s.user}</th><th style="text-align:right">${s.purchasePrice}</th><th style="text-align:right">${s.currentValue}</th><th style="text-align:right">${s.usage}</th><th style="text-align:right">${s.repairCost}</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <p class="no-print" style="margin-top:20px;color:#888;font-size:11px;text-align:center">${s.printHint}</p>
</body>
</html>`;

    const wantPdf = url.searchParams.get("pdf") === "1";
    if (wantPdf) {
      const pdf = await htmlToPdf(html, { format: "A4", landscape: false });
      const stamp = asOfRaw ? format(asOf, "yyyyMMdd") : format(new Date(), "yyyyMMdd");
      return new NextResponse(new Blob([pdf], { type: "application/pdf" }), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="equipment_${stamp}.pdf"`,
        },
      });
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
