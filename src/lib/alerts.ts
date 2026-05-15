// Path: src/lib/alerts.ts
// ============================================================
// File: alerts.ts
// Path: equip-track/src/lib/alerts.ts
// Desc: ระบบแจ้งเตือน — ประกันหมด, บำรุงรักษา, อุปกรณ์หมดอายุ
//       ใช้ Resend สำหรับส่งอีเมล (ฟรี 3,000/เดือน)
//       เรียกจาก Vercel Cron Job ทุกวัน
// ============================================================

import { prisma } from "./prisma"; // ดึง ORM ที่สร้างไว้ใน Lib prisma 
import { Resend } from "resend"; // class from library Resend สำหรับส่งอีเมล
import { addDays, isBefore, format } from "date-fns";// Functions from library date-fns สำหรับจัดการวันเวลา
import { th } from "date-fns/locale"; 
import { calculateDepreciation } from "./depreciation"; // ฟังชั่นคำนวรค่าเสื่อมราคา

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface Alert {
  type: "warranty" | "maintenance" | "end_of_life";
  severity: "danger" | "warning" | "info";
  assetCode: string;
  assetName: string;
  message: string;
  daysRemaining: number;
}

/**
 * ตรวจสอบและรวบรวม alerts ทั้งหมด
 * @param daysAhead จำนวนวันล่วงหน้าที่จะแจ้งเตือน (default: 30)
 */
export async function collectAlerts(daysAhead = 30): Promise<Alert[]> {
  const now = new Date();
  const deadline = addDays(now, daysAhead);
  const alerts: Alert[] = [];

  const assets = await prisma.asset.findMany({
    where: { status: { not: "RETIRED" } },
    select: {
      code: true,
      name: true,
      warrantyEnd: true,
      nextMaintenance: true,
      purchasePrice: true,
      purchaseDate: true,
      expectedLife: true,
    },
  });

  for (const asset of assets) {
    // 1. ประกันหมด
    if (asset.warrantyEnd && isBefore(asset.warrantyEnd, deadline)) {
      const days = Math.ceil(
        (asset.warrantyEnd.getTime() - now.getTime()) / 86400000
      );
      alerts.push({
        type: "warranty",
        severity: days < 0 ? "danger" : "warning",
        assetCode: asset.code,
        assetName: asset.name,
        message:
          days < 0
            ? `ประกันหมดแล้ว ${Math.abs(days)} วัน`
            : `ประกันจะหมดใน ${days} วัน (${format(asset.warrantyEnd, "d MMM yyyy", { locale: th })})`,
        daysRemaining: days,
      });
    }

    // 2. บำรุงรักษา
    if (asset.nextMaintenance && isBefore(asset.nextMaintenance, deadline)) {
      const days = Math.ceil(
        (asset.nextMaintenance.getTime() - now.getTime()) / 86400000
      );
      alerts.push({
        type: "maintenance",
        severity: days < 0 ? "danger" : "info",
        assetCode: asset.code,
        assetName: asset.name,
        message:
          days < 0
            ? `เลยกำหนดบำรุงรักษา ${Math.abs(days)} วัน`
            : `ถึงกำหนดบำรุงรักษาใน ${days} วัน`,
        daysRemaining: days,
      });
    }

    // 3. อายุการใช้งานใกล้หมด (>= 90%)
    const price = Number(asset.purchasePrice);
    const dep = calculateDepreciation(
      price,
      asset.purchaseDate,
      asset.expectedLife
    );
    if (dep.percentUsed >= 90) {
      alerts.push({
        type: "end_of_life",
        severity: "warning",
        assetCode: asset.code,
        assetName: asset.name,
        message: `ใช้งานแล้ว ${dep.yearsUsed.toFixed(1)}/${asset.expectedLife} ปี (${dep.percentUsed}%)`,
        daysRemaining: Math.round((asset.expectedLife - dep.yearsUsed) * 365),
      });
    }
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * ส่งอีเมลแจ้งเตือนรายวัน
 * เรียกจาก /api/cron/alerts (Vercel Cron)
 */
export async function sendDailyAlertEmail(): Promise<{ // <> = generic type annotation สำหรับบอกว่า function นี้จะ return อะไร
  sent: boolean;
  alertCount: number;
}> {
  const alerts = await collectAlerts(30);

  if (alerts.length === 0) {
    return { sent: false, alertCount: 0 };
  }

  const dangerAlerts = alerts.filter((a) => a.severity === "danger");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const infoAlerts = alerts.filter((a) => a.severity === "info");

  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">🔔 EquipTrack — แจ้งเตือนรายวัน</h2>
      <p>พบ ${alerts.length} รายการที่ต้องดำเนินการ</p>

      ${dangerAlerts.length > 0 ? `
        <h3 style="color: #ef4444;">🔴 ด่วน (${dangerAlerts.length})</h3>
        <ul>${dangerAlerts.map((a) => `<li><strong>${a.assetCode}</strong> ${a.assetName} — ${a.message}</li>`).join("")}</ul>
      ` : ""}

      ${warningAlerts.length > 0 ? `
        <h3 style="color: #f59e0b;">🟡 เตือน (${warningAlerts.length})</h3>
        <ul>${warningAlerts.map((a) => `<li><strong>${a.assetCode}</strong> ${a.assetName} — ${a.message}</li>`).join("")}</ul>
      ` : ""}

      ${infoAlerts.length > 0 ? `
        <h3 style="color: #3b82f6;">🔵 แจ้งทราบ (${infoAlerts.length})</h3>
        <ul>${infoAlerts.map((a) => `<li><strong>${a.assetCode}</strong> ${a.assetName} — ${a.message}</li>`).join("")}</ul>
      ` : ""}

      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">EquipTrack — ${format(new Date(), "d MMMM yyyy", { locale: th })}</p>
    </div>
  `;

  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return { sent: false, alertCount: alerts.length };
  }

  await resend.emails.send({
    from: process.env.ALERT_FROM_EMAIL!,
    to: process.env.ALERT_TO_EMAIL!,
    subject: `🔔 EquipTrack: ${alerts.length} รายการต้องดำเนินการ${dangerAlerts.length > 0 ? " (มีด่วน!)" : ""}`,
    html,
  });

  return { sent: true, alertCount: alerts.length };
}
