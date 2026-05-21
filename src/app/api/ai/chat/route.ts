// Path: src/app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
// ไฟลนีัเ้ใช้ได้เฉาพะ ข้อมูล้นอยๆ ถ้าเยอะจะเผา API จัดๆ ต้องแอก้ให้มันป้อน แค่ที่้ใช้ไม่ใช่ป้อนทั้งหมด
export const dynamic = "force-dynamic"; // ปิด caching สำหรับ route นี้ เพราะข้อมูลต้องสดใหม่ตลอดเวลา
// instruction = คำแนะนำ
function getLocaleInstruction(locale: string): string {
  if (locale === "th") return "คุณต้องตอบเป็นภาษาไทยเท่านั้น ห้ามตอบภาษาอื่น ใช้สกุลเงินบาท";
  if (locale === "ja") return "必ず日本語のみで返答してください。他の言語を使用しないでください。通貨はバーツ(฿)を使用してください。";
  return "You MUST respond in English only. Do not use any other language. Use Thai Baht (฿) for currency.";
}

async function getSystemContext(locale: string) {
  // ดึงข้อมูลหลายตัวแบบพร้อมกัน ด้วย การ รวมใน Arr และ Promise.all 
  const [assets, recentMaintenance, activeAssignments, bookings] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        assignments: { where: { dateIn: null }, take: 1 },
      },
    }),
    prisma.maintenanceRecord.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: { asset: { select: { code: true, name: true } } },
    }),
    prisma.assignment.findMany({
      where: { dateIn: null },
      include: { asset: { select: { code: true, name: true } } },
    }),
    prisma.booking.findMany({
      where: { status: { in: ["PENDING", "APPROVED", "ACTIVE"] } },
      include: { asset: { select: { code: true, name: true } } },
    }),
  ]);

  const assetSummary = assets.map((a) => {
    const dep = calculateDepreciation(Number(a.purchasePrice), a.purchaseDate, a.expectedLife);
    const assignedTo = a.assignments[0]?.personName || null;
    return {
      code: a.code,
      name: a.name,
      brand: a.brand,
      model: a.model,
      serialNumber: a.serialNumber,
      category: a.category,
      status: a.status,
      location: a.location,
      notes: a.notes,
      purchasePrice: Number(a.purchasePrice),
      purchaseDate: a.purchaseDate?.toISOString().slice(0, 10) || null,
      expectedLife: a.expectedLife,
      currentValue: Math.round(dep.currentValue),
      percentUsed: dep.percentUsed,
      warrantyEnd: a.warrantyEnd?.toISOString().slice(0, 10) || null,
      nextMaintenance: a.nextMaintenance?.toISOString().slice(0, 10) || null,
      assignedTo,
    };
  });

  return `You are Asset Management AI Assistant — an intelligent equipment management helper for a small business.
Today's date: ${new Date().toISOString().slice(0, 10)}

EQUIPMENT DATABASE (${assets.length} items):
${JSON.stringify(assetSummary, null, 1)}

ACTIVE ASSIGNMENTS (${activeAssignments.length}):
${activeAssignments.map((a) => `- ${a.asset.code} ${a.asset.name} → ${a.personName} (${a.department || "N/A"})`).join("\n")}

ACTIVE BOOKINGS (${bookings.length}):
${bookings.map((b) => `- ${b.asset.code} ${b.asset.name} → ${b.personName} (${b.status})`).join("\n")}

RECENT MAINTENANCE (last 10):
${recentMaintenance.map((m) => `- ${m.date.toISOString().slice(0, 10)}: ${m.asset.code} ${m.asset.name} — ${m.description} (${Number(m.cost)} baht)`).join("\n")}

CAPABILITIES:
- Answer questions about equipment status, location, assignments, maintenance history
- Provide cost analysis and repair vs replacement recommendations
- Predict upcoming maintenance needs based on patterns
- Suggest optimal equipment allocation
- Provide depreciation insights
- Help with equipment search and filtering
- Give budget planning advice based on equipment lifecycle

Be concise and helpful. Use specific equipment codes and data from the database.

LANGUAGE INSTRUCTION: ${getLocaleInstruction(locale)}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. แกะ request body
    const { messages, locale } = await request.json();
    //      ^^^^^^^^  ^^^^^^
    //      ประวัติการคุย  ภาษา (th/ja/en)

    // ตัวอย่าง:
    // messages = [
    //   { role: "user", content: "สินทรัพย์ LAP001 อยู่ไหน" }
    // ]
    // locale = "th"

      // 2. เช็ค API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // 3. ดึงข้อมูลล่าสุดจาก DB มาสร้าง context
    const systemContext = await getSystemContext(locale);
    // systemContext = "You are Asset Management AI...\nDATABASE: [...]"

    // 4. เรียก OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContext },
        //       ^^^^^^ บทบาทของ AI + ข้อมูล DB

        ...messages.slice(-10), // เอา 10 ข้อความล่าสุดจากประวัติการคุยมาให้ AI ดู (ถ้ามี)
      ],
      max_tokens: 1000,// ตอบไม่เกิน 1000 token
      temperature: 0.7, // ความสร้างสรรค์ของคำตอบ (0.7 คือค่อนข้างสร้างสรรค์)
    });
    //5. ส่งคำตอบกลับไปให้ frontend
    return NextResponse.json({
      message: completion.choices[0]?.message?.content || "",
       //       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      //       คำตอบจาก AI (ถ้าไม่มีให้ "")
    });
  } catch (error: any) {
    // 6. จัดการ error
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: error.message || "AI service error" },
      { status: 500 }
    );
  }
}
