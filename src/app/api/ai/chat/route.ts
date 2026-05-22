// Path: src/app/api/ai/chat/route.ts
// AI Chat route — streaming + tool calling + auth-guarded
// ไฟล์นี้ให้ AI เรียก tool เพื่อขอข้อมูลเฉพาะที่ต้องการแทนการยัด DB ทั้งก้อน
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";

export const dynamic = "force-dynamic";

function getLocaleInstruction(locale: string): string {
  if (locale === "th") return "คุณต้องตอบเป็นภาษาไทยเท่านั้น ห้ามตอบภาษาอื่น ใช้สกุลเงินบาท";
  if (locale === "ja") return "必ず日本語のみで返答してください。他の言語を使用しないでください。通貨はバーツ(฿)を使用してください。";
  return "You MUST respond in English only. Do not use any other language. Use Thai Baht (฿) for currency.";
}

// ── Tool definitions exposed to the model ──
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_summary_stats",
      description: "Get high-level inventory totals: asset counts by status/category, total purchase value, current value, active assignments, active bookings. Use this for overview/dashboard questions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_assets",
      description: "Search assets by free-text query (matches code, name, brand, model, serial, location) with optional filters. Returns up to 20 matches. Use when user asks about specific equipment.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search across code/name/brand/model/serial/location" },
          category: { type: "string", enum: ["LAPTOP", "MONITOR", "VEHICLE", "FURNITURE", "CAMERA", "PROJECTOR", "PRINTER", "PHONE", "OTHER"] },
          status: { type: "string", enum: ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"] },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_asset_details",
      description: "Get full details for one asset by its code (e.g. LAP001): specs, depreciation, current assignment, recent maintenance, warranty.",
      parameters: {
        type: "object",
        properties: { code: { type: "string" } },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_maintenance_history",
      description: "Get maintenance records. Either recent across all assets (default 10) or for a specific asset by code.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Optional asset code to filter by" },
          limit: { type: "number", description: "Max records (default 10, max 50)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_assignments",
      description: "Get active assignments (equipment currently checked out to people). Optionally filter by department.",
      parameters: {
        type: "object",
        properties: { department: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_upcoming_attention",
      description: "List assets needing attention soon: warranty expiring, maintenance due, or end-of-life (>80% depreciated) within next N days.",
      parameters: {
        type: "object",
        properties: { withinDays: { type: "number", description: "Default 30" } },
      },
    },
  },
];

// ── Tool implementations ──
async function execTool(name: string, args: any): Promise<unknown> {
  switch (name) {
    case "get_summary_stats": {
      const [byCategory, byStatus, totals, assignments, bookings] = await Promise.all([
        prisma.asset.groupBy({ by: ["category"], _count: { id: true } }),
        prisma.asset.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.asset.aggregate({ _sum: { purchasePrice: true }, _count: { id: true } }),
        prisma.assignment.count({ where: { dateIn: null } }),
        prisma.booking.count({ where: { status: { in: ["PENDING", "APPROVED", "ACTIVE"] } } }),
      ]);
      const assets = await prisma.asset.findMany({ select: { purchasePrice: true, purchaseDate: true, expectedLife: true } });
      const currentValue = assets.reduce((sum, a) => sum + calculateDepreciation(Number(a.purchasePrice), a.purchaseDate, a.expectedLife).currentValue, 0);
      return {
        totalAssets: totals._count.id,
        totalPurchaseValue: Number(totals._sum.purchasePrice || 0),
        currentValue: Math.round(currentValue),
        byCategory: byCategory.map((r) => ({ category: r.category, count: r._count.id })),
        byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id })),
        activeAssignments: assignments,
        activeBookings: bookings,
      };
    }

    case "search_assets": {
      const { query, category, status } = args as { query?: string; category?: string; status?: string };
      const q = (query || "").trim();
      const results = await prisma.asset.findMany({
        where: {
          AND: [
            category ? { category: category as any } : {},
            status ? { status: status as any } : {},
            q
              ? {
                  OR: [
                    { code: { contains: q } },
                    { name: { contains: q } },
                    { brand: { contains: q } },
                    { model: { contains: q } },
                    { serialNumber: { contains: q } },
                    { location: { contains: q } },
                  ],
                }
              : {},
          ],
        },
        take: 20,
        select: { code: true, name: true, brand: true, model: true, category: true, status: true, location: true },
      });
      return { count: results.length, results };
    }

    case "get_asset_details": {
      const { code } = args as { code: string };
      const a = await prisma.asset.findUnique({
        where: { code },
        include: {
          assignments: { where: { dateIn: null }, take: 1 },
          maintenanceRecords: { orderBy: { date: "desc" }, take: 5 },
        },
      });
      if (!a) return { error: `Asset ${code} not found` };
      const dep = calculateDepreciation(Number(a.purchasePrice), a.purchaseDate, a.expectedLife);
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
        warrantyEnd: a.warrantyEnd?.toISOString().slice(0, 10) || null,
        nextMaintenance: a.nextMaintenance?.toISOString().slice(0, 10) || null,
        depreciation: { currentValue: Math.round(dep.currentValue), percentUsed: dep.percentUsed },
        assignedTo: a.assignments[0]?.personName || null,
        recentMaintenance: a.maintenanceRecords.map((m) => ({
          date: m.date.toISOString().slice(0, 10),
          type: m.type,
          description: m.description,
          cost: Number(m.cost),
        })),
      };
    }

    case "get_maintenance_history": {
      const { code, limit } = args as { code?: string; limit?: number };
      const take = Math.min(Math.max(limit || 10, 1), 50);
      const records = await prisma.maintenanceRecord.findMany({
        where: code ? { asset: { code } } : {},
        orderBy: { date: "desc" },
        take,
        include: { asset: { select: { code: true, name: true } } },
      });
      return records.map((m) => ({
        date: m.date.toISOString().slice(0, 10),
        assetCode: m.asset.code,
        assetName: m.asset.name,
        type: m.type,
        description: m.description,
        cost: Number(m.cost),
      }));
    }

    case "get_assignments": {
      const { department } = args as { department?: string };
      const rows = await prisma.assignment.findMany({
        where: { dateIn: null, ...(department ? { department: { contains: department } } : {}) },
        include: { asset: { select: { code: true, name: true, category: true } } },
        take: 50,
      });
      return rows.map((a) => ({
        assetCode: a.asset.code,
        assetName: a.asset.name,
        category: a.asset.category,
        person: a.personName,
        department: a.department,
        since: a.dateOut.toISOString().slice(0, 10),
      }));
    }

    case "get_upcoming_attention": {
      const { withinDays } = args as { withinDays?: number };
      const days = Math.max(withinDays || 30, 1);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const assets = await prisma.asset.findMany({
        where: {
          OR: [
            { warrantyEnd: { lte: cutoff, gte: new Date() } },
            { nextMaintenance: { lte: cutoff } },
          ],
        },
        select: { code: true, name: true, warrantyEnd: true, nextMaintenance: true, purchasePrice: true, purchaseDate: true, expectedLife: true },
        take: 30,
      });
      const today = new Date();
      const items = assets.map((a) => {
        const dep = calculateDepreciation(Number(a.purchasePrice), a.purchaseDate, a.expectedLife);
        return {
          code: a.code,
          name: a.name,
          warrantyEnd: a.warrantyEnd?.toISOString().slice(0, 10) || null,
          nextMaintenance: a.nextMaintenance?.toISOString().slice(0, 10) || null,
          percentUsed: dep.percentUsed,
          warrantyExpiringSoon: a.warrantyEnd ? a.warrantyEnd <= cutoff && a.warrantyEnd >= today : false,
          maintenanceDue: a.nextMaintenance ? a.nextMaintenance <= cutoff : false,
          endOfLife: dep.percentUsed >= 80,
        };
      });
      return items;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(request: NextRequest) {
  // Auth guard — same pattern as other routes
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "AI service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let messages: Array<{ role: string; content: string }>;
  let locale: string;
  try {
    const body = await request.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    locale = typeof body.locale === "string" ? body.locale : "en";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `You are Asset Management AI Assistant — an intelligent equipment management helper for a small business in Thailand.
Today's date: ${new Date().toISOString().slice(0, 10)}

You have access to tools that query the live equipment database. Always call a tool to get current data instead of guessing. Prefer the smallest tool that answers the question (e.g. get_summary_stats for overview, search_assets for finding items, get_asset_details for one item).

When you reference equipment, always use its code (e.g. LAP001). Be concise.

FORMATTING RULES (the chat panel is narrow ~380px — wide formats break):
- NEVER use markdown tables (no \`|\` pipe tables, no \`---\` separators). They render unreadable on one line.
- NEVER use code blocks for data.
- Use short bullet lists with \`-\` for multiple items. One item per line.
- For each item, write a single compact line like: \`- CODE — Name · key fact · key fact\` using \`·\` or \`,\` to separate fields. Avoid more than ~3 fields per line.
- If the list is long (>10 items), summarize first ("พบ 14 รายการ ที่ต้องดูแลภายใน 30 วัน") then show the top 5–10 most urgent.
- Use **bold** sparingly for emphasis. Plain prose is preferred for short answers.

LANGUAGE INSTRUCTION: ${getLocaleInstruction(locale)}`;

  // Build conversation: trim to last 10 turns to control cost
  const conversation: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Tool loop: let the model call tools up to 5 times before final answer
        for (let i = 0; i < 5; i++) {
          const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: conversation,
            tools,
            tool_choice: "auto",
            max_tokens: 1000,
            temperature: 0.7,
          });

          const choice = resp.choices[0]?.message;
          if (!choice) break;

          if (choice.tool_calls && choice.tool_calls.length > 0) {
            conversation.push(choice);
            for (const call of choice.tool_calls) {
              if (call.type !== "function") continue;
              let parsed: any = {};
              try {
                parsed = JSON.parse(call.function.arguments || "{}");
              } catch {
                parsed = {};
              }
              send({ type: "tool", name: call.function.name });
              const result = await execTool(call.function.name, parsed);
              conversation.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(result),
              });
            }
            continue;
          }

          // Final answer — emit as a single delta (we already have the full text)
          send({ type: "delta", text: choice.content || "" });
          send({ type: "done" });
          controller.close();
          return;
        }

        send({ type: "delta", text: "(AI did not produce a final answer)" });
        send({ type: "done" });
        controller.close();
      } catch (err) {
        console.error("AI Chat error:", err);
        send({ type: "error", message: "AI service error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
