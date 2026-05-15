// Path: src/app/(features)/migrate-csharp/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MigrateCSharpClient } from "./MigrateCSharpClient";

export const dynamic = "force-dynamic";

export default async function MigrateCSharpPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/overview");
  }
  return <MigrateCSharpClient />;
}
