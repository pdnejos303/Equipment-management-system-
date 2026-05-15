// Path: src/app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { getCached, setCache } from "@/lib/ai-cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { assetId, locale, force } = await request.json();

    if (!process.env.OPENAI_API_KEY) { 
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Return cached data unless force refresh
    const cacheKey = `analyze_${assetId}_${locale}`;
    if (!force) {
      const cached = getCached<any>(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        maintenanceRecords: { orderBy: { date: "desc" } },
        assignments: { orderBy: { dateOut: "desc" }, take: 5 },
        bookings: { orderBy: { dateStart: "desc" }, take: 5 },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const dep = calculateDepreciation(Number(asset.purchasePrice), asset.purchaseDate, asset.expectedLife);
    const totalRepair = asset.maintenanceRecords.reduce((s, m) => s + Number(m.cost), 0);

    const localeInstruction =
      locale === "th" ? "ข้อความทุกช่องใน JSON (summary, maintenanceInsights, riskFactors, actionItems, replacementROI) ต้องเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่น ใช้สกุลเงินบาท" :
      locale === "ja" ? "JSONの全てのテキストフィールド(summary, maintenanceInsights, riskFactors, actionItems, replacementROI)は必ず日本語のみで記述してください。通貨はバーツ(฿)を使用してください。" :
      "All text fields in the JSON (summary, maintenanceInsights, riskFactors, actionItems, replacementROI) must be in English only. Use Thai Baht (฿).";

    const prompt = `Analyze this equipment and provide comprehensive insights:

EQUIPMENT:
- Code: ${asset.code}
- Name: ${asset.name}
- Brand: ${asset.brand || "N/A"}, Model: ${asset.model || "N/A"}
- Category: ${asset.category}
- Status: ${asset.status}
- Purchase: ${asset.purchaseDate.toISOString().slice(0, 10)}, Price: ${Number(asset.purchasePrice)} baht
- Current Value: ${Math.round(dep.currentValue)} baht (${dep.percentUsed}% depreciated)
- Expected Life: ${asset.expectedLife} years, Used: ${dep.yearsUsed.toFixed(1)} years
- Warranty End: ${asset.warrantyEnd?.toISOString().slice(0, 10) || "N/A"}
- Location: ${asset.location || "N/A"}

MAINTENANCE HISTORY (${asset.maintenanceRecords.length} records, total ${totalRepair} baht):
${asset.maintenanceRecords.map((m) => `- ${m.date.toISOString().slice(0, 10)}: ${m.type} — ${m.description} (${Number(m.cost)} baht)`).join("\n") || "None"}

ASSIGNMENT HISTORY (recent 5):
${asset.assignments.map((a) => `- ${a.dateOut.toISOString().slice(0, 10)} to ${a.dateIn?.toISOString().slice(0, 10) || "present"}: ${a.personName}`).join("\n") || "None"}

${localeInstruction}

Return a JSON object with:
- "healthScore": 0-100 (overall equipment health)
- "recommendation": "keep" | "repair" | "replace" | "retire"
- "summary": 2-3 sentence overall assessment
- "costAnalysis": { "repairRatio": percentage of purchase price spent on repairs, "projectedAnnualCost": estimated annual maintenance cost, "replacementROI": explanation of repair vs replace economics }
- "maintenanceInsights": array of 2-3 strings with specific observations
- "riskFactors": array of 1-3 strings with potential risks
- "actionItems": array of 2-3 specific recommended actions

Return ONLY the JSON object, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    setCache(cacheKey, analysis);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("AI Analyze error:", error);
    return NextResponse.json(
      { error: error.message || "AI service error" },
      { status: 500 }
    );
  }
}
