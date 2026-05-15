// Path: src/app/(features)/assignments/page.tsx
import { prisma } from "@/lib/prisma";
import { AssignmentsClient } from "./AssignmentsClient";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const [assignments, assets] = await Promise.all([
    prisma.assignment.findMany({
      include: {
        asset: { select: { id: true, code: true, name: true, status: true, category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { dateOut: "desc" },
    }),
    prisma.asset.findMany({
      select: { id: true, code: true, name: true, status: true, category: true },
    }),
  ]);

  const active = assignments.filter((a) => !a.dateIn);
  const returned = assignments.filter((a) => a.dateIn);

  const currentAssignments = active.map((a) => ({
    id: a.id,
    assetCode: a.asset.code,
    assetName: a.asset.name,
    personName: a.personName,
  }));

  const serialize = (a: typeof assignments[0]) => ({
    id: a.id,
    personName: a.personName,
    department: a.department,
    dateOut: a.dateOut.toISOString(),
    dateIn: a.dateIn?.toISOString() || null,
    notes: a.notes,
    asset: { id: a.asset.id, code: a.asset.code, name: a.asset.name },
  });

  return (
    <AssignmentsClient
      data={{
        active: active.map(serialize),
        returned: returned.map(serialize),
        total: assignments.length,
        assets,
        currentAssignments,
      }}
    />
  );
}
