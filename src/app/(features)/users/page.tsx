// Path: src/app/(features)/users/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/overview");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          assignments: true,
          bookings: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <UsersClient users={users} currentUserId={(session.user as any).id} />;
}
