// Path: src/app/api/cron/alerts/route.ts
// ============================================================
// File: /api/cron/alerts/route.ts
// Desc: Vercel Cron Job — ส่งอีเมลแจ้งเตือนรายวัน
//       เรียกทุกวัน 08:00 เวลาไทย (UTC+7 = 01:00 UTC)
//       Protected by CRON_SECRET header
// ============================================================

import { NextResponse } from "next/server";
import { sendDailyAlertEmail } from "@/lib/alerts";

export async function GET(req: Request) {
  // ตรวจสอบ secret จาก Vercel Cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyAlertEmail();
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      alertCount: result.alertCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/alerts] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
