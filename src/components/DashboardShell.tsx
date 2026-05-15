// Path: src/components/DashboardShell.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

interface DashboardShellProps {
  children: React.ReactNode;
  alertCount: number;
}

export function DashboardShell({ children, alertCount }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar
        alertCount={alertCount}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 h-[100dvh] overflow-y-auto">
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-3 sm:p-5 lg:p-8 relative z-10">{children}</main>
      </div>
    </div>
  );
}
