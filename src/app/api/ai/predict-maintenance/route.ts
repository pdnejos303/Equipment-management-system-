// Path: src/app/api/ai/predict-maintenance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { getCached, setCache } from "@/lib/ai-cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { locale, force } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Return cached data unless force refresh
    const cacheKey = `predict_${locale}`;
    if (!force) {
      const cached = getCached<{ predictions: any[] }>(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    const assets = await prisma.asset.findMany({
      where: { status: { not: "RETIRED" } },
      include: {
        maintenanceRecords: { orderBy: { date: "desc" } },
      },
    });

    const assetData = assets.map((a) => {
      const dep = calculateDepreciation(Number(a.purchasePrice), a.purchaseDate, a.expectedLife);
      return {
        code: a.code,
        name: a.name,
        category: a.category,
        status: a.status,
        purchaseDate: a.purchaseDate.toISOString().slice(0, 10),
        purchasePrice: Number(a.purchasePrice),
        percentUsed: dep.percentUsed,
        nextMaintenance: a.nextMaintenance?.toISOString().slice(0, 10) || null,
        maintenanceHistory: a.maintenanceRecords.map((m) => ({
          date: m.date.toISOString().slice(0, 10),
          type: m.type,
          description: m.description,
          cost: Number(m.cost),
        })),
      };
    });

    const localeInstruction =
      locale === "th" ? "ช่อง reason ใน JSON ต้องเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่น (ค่า type และ priority ให้คงไว้เป็นภาษาอังกฤษตามที่กำหนด)" :
      locale === "ja" ? "JSONのreasonフィールドは必ず日本語のみで記述してください。(typeとpriorityの値は指定された英語のまま維持してください)" :
      "The reason field in each JSON object must be in English only. (Keep type and priority values as specified in English.)";

    const prompt = `You are an equipment maintenance prediction AI. Analyze the maintenance history and equipment data to predict upcoming maintenance needs.

TODAY: ${new Date().toISOString().slice(0, 10)}

EQUIPMENT DATA:
${JSON.stringify(assetData, null, 1)}

${localeInstruction}

Return a JSON array of predictions for equipment that likely needs maintenance soon. Each prediction must have:
- "assetCode": equipment code
- "assetName": equipment name
- "predictedDate": predicted date for next maintenance (YYYY-MM-DD)
- "confidence": "high", "medium", or "low"
- "reason": 1 sentence explanation
- "estimatedCost": estimated cost in baht (number)
- "type": "REPAIR", "PREVENTIVE", or "INSPECTION"
- "priority": "urgent", "soon", or "planned"

Sort by priority (urgent first). Maximum 8 predictions.
Return ONLY the JSON array, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const result = { predictions };
    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Predict error:", error);
    return NextResponse.json(
      { error: error.message || "AI service error" },
      { status: 500 }
    );
  }
}
