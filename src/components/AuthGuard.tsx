// Path: src/components/AuthGuard.tsx
"use client";

import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ 
  children, 
  session, 
  role 
}: { 
  children: React.ReactNode;
  session: any;
  role: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Allow unauthenticated access to /scan
    if (pathname?.startsWith("/scan")) {
      return;
    }

    if (!session || !role || role === "GUEST") {
      const callback = encodeURIComponent(pathname || "/overview");
      signOut({ redirect: false }).finally(() => {
        router.replace(`/login?callbackUrl=${callback}`);
      });
    }
  }, [session, role, router, pathname]);

  if (!pathname?.startsWith("/scan") && (!session || !role || role === "GUEST")) {
    return null;
  }
  return <>{children}</>;
}
