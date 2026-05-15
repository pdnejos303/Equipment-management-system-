// Path: src/app/(features)/bookings/page.tsx
import { prisma } from "@/lib/prisma";
import { BookingsClient } from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [bookings, assets] = await Promise.all([
    prisma.booking.findMany({
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { dateStart: "desc" },
    }),
    prisma.asset.findMany({
      select: { id: true, code: true, name: true, status: true, category: true },
    }),
  ]);

  const activeCount = bookings.filter((b) => ["PENDING", "APPROVED", "ACTIVE"].includes(b.status)).length;

  return (
    <BookingsClient
      data={{
        bookings: bookings.map((b) => ({
          id: b.id,
          personName: b.personName,
          dateStart: b.dateStart.toISOString(),
          dateEnd: b.dateEnd.toISOString(),
          purpose: b.purpose,
          status: b.status,
          asset: { id: b.asset.id, code: b.asset.code, name: b.asset.name },
        })),
        assets,
        activeCount,
      }}
    />
  );
}
