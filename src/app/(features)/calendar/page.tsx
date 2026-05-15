// Path: src/app/(features)/calendar/page.tsx
import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [bookings, maintenance, assignments] = await Promise.all([
    prisma.booking.findMany({
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: { dateStart: "asc" },
    }),
    prisma.maintenanceRecord.findMany({
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.assignment.findMany({
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: { dateOut: "asc" },
    }),
  ]);

  return (
    <CalendarClient
      data={{
        bookings: bookings.map((b) => ({
          id: b.id,
          type: "booking" as const,
          title: `${b.asset.code} — ${b.personName}`,
          assetId: b.asset.id,
          assetCode: b.asset.code,
          assetName: b.asset.name,
          category: b.asset.category,
          personName: b.personName,
          start: b.dateStart.toISOString(),
          end: b.dateEnd.toISOString(),
          status: b.status,
          purpose: b.purpose,
        })),
        maintenance: maintenance.map((m) => ({
          id: m.id,
          type: "maintenance" as const,
          title: `${m.asset.code} — ${m.description}`,
          assetId: m.asset.id,
          assetCode: m.asset.code,
          assetName: m.asset.name,
          category: m.asset.category,
          date: m.date.toISOString(),
          description: m.description,
          cost: Number(m.cost),
          maintType: m.type,
          vendor: m.vendor,
        })),
        assignments: assignments.map((a) => ({
          id: a.id,
          type: "assignment" as const,
          title: `${a.asset.code} — ${a.personName}`,
          assetId: a.asset.id,
          assetCode: a.asset.code,
          assetName: a.asset.name,
          category: a.asset.category,
          personName: a.personName,
          department: a.department,
          start: a.dateOut.toISOString(),
          end: a.dateIn?.toISOString() || null,
        })),
      }}
    />
  );
}
