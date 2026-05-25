// Path: src/app/(features)/assets/page.tsx
import { prisma } from "@/lib/prisma";
import { AssetsClient } from "./AssetsClient";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const where: any = {};
  if (sp.status) where.status = sp.status;
  if (sp.category) where.category = sp.category;
  if (sp.search) {
    where.OR = [
      { code: { contains: sp.search } },
      { name: { contains: sp.search } },
      { brand: { contains: sp.search } },
      { serialNumber: { contains: sp.search } },
    ];
  }

  const assets = await prisma.asset.findMany({
    where,
    include: {
      photos: { where: { isPrimary: true }, take: 1 },
      assignments: { where: { dateIn: null }, take: 1, select: { personName: true } },
    },
    orderBy: { code: "asc" },
  });

  const rows = assets.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    brand: a.brand || "",
    model: a.model || "",
    category: a.category,
    status: a.status,
    purchasePrice: Number(a.purchasePrice),
    photo: a.photos[0]?.url || null,
    assignedTo: a.assignments[0]?.personName || null,
  }));

  const totalValue = rows.reduce((s, a) => s + a.purchasePrice, 0);

  return (
    <AssetsClient
      data={{
        assets: rows,
        totalValue,
        searchParams: sp,
      }}
    />
  );
}
