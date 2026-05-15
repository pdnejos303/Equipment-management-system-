// Path: src/app/(features)/migrate/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MigrateClient } from "./MigrateClient";

export const dynamic = "force-dynamic";

export default async function MigratePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/overview");
  }

  return <MigrateClient />;
}
