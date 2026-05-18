// Path: src/app/(features)/in-use/page.tsx
import { prisma } from "@/lib/prisma";
import { InUseClient } from "./InUseClient";

export const dynamic = "force-dynamic";

export default async function InUsePage() {
  const [assignments, bookings] = await Promise.all([
    prisma.assignment.findMany({
      where: { dateIn: null },
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: { dateOut: "desc" },
    }),
    prisma.booking.findMany({
      where: { status: "ACTIVE" },
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: { dateStart: "desc" },
    }),
  ]);

  const items = [
    ...assignments.map((a) => ({
      key: `assign-${a.id}`,
      personName: a.personName,
      department: a.department,
      source: "assignment" as const,
      since: a.dateOut.toISOString(),
      assetId: a.asset.id,
      assetCode: a.asset.code,
      assetName: a.asset.name,
      assetCategory: a.asset.category,
    })),
    ...bookings.map((b) => ({
      key: `booking-${b.id}`,
      personName: b.personName,
      department: null as string | null,
      source: "booking" as const,
      since: b.dateStart.toISOString(),
      assetId: b.asset.id,
      assetCode: b.asset.code,
      assetName: b.asset.name,
      assetCategory: b.asset.category,
    })),
  ];

  return <InUseClient items={items} />;
}
