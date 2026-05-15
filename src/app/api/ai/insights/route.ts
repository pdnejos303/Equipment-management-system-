// Path: src/app/api/ai/insights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { collectAlerts } from "@/lib/alerts";
import { getCached, setCache } from "@/lib/ai-cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { locale, force } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Return cached data unless force refresh
    const cacheKey = `insights_${locale}`;
    if (!force) {
      const cached = getCached<{ insights: any[] }>(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    const [assets, maintenance, alerts, assignments] = await Promise.all([
      prisma.asset.findMany({
        include: {
          maintenanceRecords: { select: { cost: true, date: true, type: true, description: true } },
          assignments: { where: { dateIn: null }, take: 1 },
        },
      }),
      prisma.maintenanceRecord.findMany({
        orderBy: { date: "desc" },
        take: 20,
        include: { asset: { select: { code: true, name: true, category: true, purchasePrice: true } } },
      }),
      collectAlerts(30).catch(() => []),
      prisma.assignment.findMany({ where: { dateIn: null } }),
    ]);

    let totalOriginal = 0;
    let totalCurrent = 0;
    let totalRepair = 0;
    const highRepairAssets: any[] = [];
    const endOfLifeAssets: any[] = [];
    const categoryRepairCosts: Record<string, { total: number; count: number }> = {};

    assets.forEach((a) => {
      const price = Number(a.purchasePrice);
      const dep = calculateDepreciation(price, a.purchaseDate, a.expectedLife);
      const repairCost = a.maintenanceRecords.reduce((s, m) => s + Number(m.cost), 0);

      totalOriginal += price;
      totalCurrent += dep.currentValue;
      totalRepair += repairCost;

      if (price > 0 && repairCost / price > 0.3) {
        highRepairAssets.push({ code: a.code, name: a.name, repairRatio: Math.round((repairCost / price) * 100), repairCost, price });
      }
      if (dep.percentUsed >= 80) {
        endOfLifeAssets.push({ code: a.code, name: a.name, percentUsed: dep.percentUsed, currentValue: Math.round(dep.currentValue) });
      }

      if (!categoryRepairCosts[a.category]) categoryRepairCosts[a.category] = { total: 0, count: 0 };
      categoryRepairCosts[a.category].total += repairCost;
      categoryRepairCosts[a.category].count++;
    });

    const localeInstruction =
      locale === "th" ? "ข้อความทุกช่องใน JSON (title, description) ต้องเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่น ใช้สกุลเงินบาท" :
      locale === "ja" ? "JSONの全てのテキストフィールド(title, description)は必ず日本語のみで記述してください。通貨はバーツ(฿)を使用してください。" :
      "All text fields in the JSON (title, description) must be in English only. Use Thai Baht (฿) for currency.";

    const prompt = `You are an equipment management AI analyst. Analyze the following data and provide exactly 4 actionable insights.

TODAY: ${new Date().toISOString().slice(0, 10)}

SUMMARY:
- Total assets: ${assets.length}
- Total purchase value: ${totalOriginal} baht
- Current value: ${Math.round(totalCurrent)} baht
- Total repair costs: ${totalRepair} baht
- Active assignments: ${assignments.length}
- Active alerts: ${alerts.length}

HIGH REPAIR COST ASSETS (repair > 30% of purchase price):
${highRepairAssets.map((a) => `${a.code} ${a.name}: repair ${a.repairCost} baht = ${a.repairRatio}% of ${a.price} baht`).join("\n") || "None"}

END OF LIFE ASSETS (>80% depreciated):
${endOfLifeAssets.map((a) => `${a.code} ${a.name}: ${a.percentUsed}% used, value ${a.currentValue} baht`).join("\n") || "None"}

REPAIR COSTS BY CATEGORY:
${Object.entries(categoryRepairCosts).map(([cat, d]) => `${cat}: ${d.total} baht across ${d.count} items`).join("\n")}

RECENT ALERTS: ${alerts.length} (${alerts.filter((a) => a.severity === "danger").length} urgent)

${localeInstruction}

Return a JSON array of exactly 4 insight objects. Each must have:
- "icon": one of "warning", "trending_up", "savings", "schedule"
- "title": short title (max 8 words)
- "description": 1-2 sentence actionable insight with specific numbers/equipment codes
- "severity": "info", "warning", or "critical"

Focus on: 1) Budget/cost insights 2) Maintenance predictions 3) Equipment replacement recommendations 4) Optimization opportunities

Return ONLY the JSON array, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content || "[]";
    // Extract JSON from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const result = { insights };
    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Insights error:", error);
    return NextResponse.json(
      { error: error.message || "AI service error" },
      { status: 500 }
    );
  }
}
