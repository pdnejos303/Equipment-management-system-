// Path: src/app/api/ai/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { type, data, locale } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const localeInstruction =
      locale === "th" ? "ข้อความทุกช่องใน JSON ต้องเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่น" :
      locale === "ja" ? "JSONの全てのテキストフィールドは必ず日本語のみで記述してください。他の言語を使用しないでください。" :
      "All text fields in the JSON must be in English only.";

    let prompt = "";

    switch (type) {
      case "category": {
        const cats = await prisma.category.findMany({ orderBy: { order: "asc" }, select: { key: true } });
        const allowed = cats.map((c) => c.key).join(", ") || "OTHER";
        prompt = `Given this equipment name: "${data.name}"${data.brand ? `, brand: "${data.brand}"` : ""}${data.model ? `, model: "${data.model}"` : ""}, suggest the best category from: ${allowed}.

Return ONLY a JSON object: {"category": "...", "confidence": 0.0-1.0}`;
        break;
      }

      case "notes":
        prompt = `Generate a brief equipment note/description for:
Name: ${data.name}
Category: ${data.category}
Brand: ${data.brand || "N/A"}
Model: ${data.model || "N/A"}

${localeInstruction}
Return ONLY a JSON object: {"notes": "..."}. Keep it under 100 characters.`;
        break;

      case "lifespan":
        prompt = `Suggest the typical expected lifespan (in years) for this equipment:
Name: ${data.name}
Category: ${data.category}
Brand: ${data.brand || "N/A"}

${localeInstruction}
Return ONLY a JSON object: {"years": number, "reason": "..."}`;
        break;

      case "maintenance_description":
        prompt = `Suggest a maintenance description for:
Equipment: ${data.assetName} (${data.category})
Maintenance type: ${data.type}
${data.lastMaintenance ? `Last maintenance: ${data.lastMaintenance}` : ""}

${localeInstruction}
Return ONLY a JSON object: {"description": "...", "estimatedCost": number}. Keep description under 80 characters.`;
        break;

      case "replacement":
        prompt = `Analyze whether this equipment should be repaired or replaced:
Name: ${data.name}
Category: ${data.category}
Purchase Price: ${data.purchasePrice} baht
Current Value: ${data.currentValue} baht
Total Repair Cost: ${data.totalRepairCost} baht
Age: ${data.yearsUsed} years
Expected Life: ${data.expectedLife} years

${localeInstruction}
Return ONLY a JSON object: {"recommendation": "repair" | "replace", "reason": "...", "urgency": "low" | "medium" | "high"}`;
        break;

      default:
        return NextResponse.json({ error: "Unknown suggestion type" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Suggest error:", error);
    return NextResponse.json(
      { error: error.message || "AI service error" },
      { status: 500 }
    );
  }
}
