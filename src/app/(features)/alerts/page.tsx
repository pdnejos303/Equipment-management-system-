// Path: src/app/(features)/alerts/page.tsx
import { collectAlerts } from "@/lib/alerts";
import { AlertsClient } from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await collectAlerts(60).catch(() => []);
  return <AlertsClient alerts={alerts} />;
}