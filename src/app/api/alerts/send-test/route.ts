// Path: src/app/api/alerts/send-test/route.ts
// ============================================================
// File: /api/alerts/send-test/route.ts
// Desc: ส่งอีเมลทดสอบแจ้งเตือน — เรียกจาก UI (Admin only)
// ============================================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Function สำหรับ ดึงข้อมูลผู้ใช้ที่ login อยู่โดยทำงาน ServerSide
import { authOptions } from "@/lib/auth"; // getServerSession ต้องการ config จาก authOptions เพื่อรู้ว่าจะเช็ค session ยังไง
import { sendDailyAlertEmail } from "@/lib/alerts";

export async function POST() {

  const session = await getServerSession(authOptions);// ใช้ getServerSession ดึงข้อมูล session ของผเ้ใช้ที่เรยก API นี้มา
  if (!session || session.user.role !== "ADMIN" && session.user.role !== "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await sendDailyAlertEmail();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[alerts/send-test] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
