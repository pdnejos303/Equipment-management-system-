// Path: src/app/(features)/layout.tsx
import { collectAlerts } from "@/lib/alerts";
import { DashboardShell } from "@/components/DashboardShell";
import { AIChatWidget } from "@/components/AIChatWidget";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const alerts = await collectAlerts(60).catch(() => []);
  const alertCount = alerts.length;

  return (
    <>
      <DashboardShell alertCount={alertCount}>{children}</DashboardShell>
      <AIChatWidget />
    </>
  );
}
