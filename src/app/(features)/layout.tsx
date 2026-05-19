// Path: src/app/(features)/layout.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { collectAlerts } from "@/lib/alerts";
import { DashboardShell } from "@/components/DashboardShell";
import { AIChatWidget } from "@/components/AIChatWidget";
import { AuthGuard } from "@/components/AuthGuard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !role) {
    redirect("/login");
  }

  const alerts = await collectAlerts(60).catch(() => []);
  const alertCount = alerts.length;

  return (
    <AuthGuard>
      <DashboardShell alertCount={alertCount}>{children}</DashboardShell>
      <AIChatWidget />
    </AuthGuard>
  );
}
