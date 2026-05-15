// Path: src/lib/role-guard.ts
// ============================================================
// File: role-guard.ts
// Path: equip-track/src/lib/role-guard.ts
// Desc: Role-based access — ฟังก์ชันเช็คสิทธิ์ทั้ง server + client
// ============================================================

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

type Role = "ADMIN" | "USER" | "VIEWER";

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,
  USER: 2,
  ADMIN: 3,
};

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ── Actions by role ──
// VIEWER: ดูอย่างเดียว
// USER:   ดู + เพิ่ม + แก้ไข
// ADMIN:  ดู + เพิ่ม + แก้ไข + ลบ + จัดการ users

export function canCreate(role: Role): boolean {
  return hasPermission(role, "USER");
}

export function canEdit(role: Role): boolean {
  return hasPermission(role, "USER");
}

export function canDelete(role: Role): boolean {
  return hasPermission(role, "ADMIN");
}

export function canManageUsers(role: Role): boolean {
  return hasPermission(role, "ADMIN");
}

// ── Server-side session check with role ──

export async function getSessionWithRole() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return {
    ...session,
    role: (session.user as any).role as Role,
    userId: (session.user as any).id as string,
  };
}

export async function requireRole(requiredRole: Role) {
  const session = await getSessionWithRole();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.role, requiredRole)) {
    throw new Error("Forbidden");
  }
  return session;
}