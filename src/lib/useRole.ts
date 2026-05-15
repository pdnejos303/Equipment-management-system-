// Path: src/lib/useRole.ts
"use client";

import { useSession } from "next-auth/react";

type Role = "ADMIN" | "USER" | "VIEWER";

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,
  USER: 2,
  ADMIN: 3,
};

function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function useRole() {
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role as Role) || "VIEWER";

  return {
    role,
    canCreate: hasPermission(role, "USER"),
    canEdit: hasPermission(role, "USER"),
    canDelete: hasPermission(role, "ADMIN"),
    canManageUsers: hasPermission(role, "ADMIN"),
    isAdmin: role === "ADMIN",
  };
}
