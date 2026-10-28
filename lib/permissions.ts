import type { Role } from "./types";
import { AppError } from "./errors";

export const ROLE_PERMISSIONS = {
  STUDENT: ["reports.own", "found.browse", "matches.own", "claims.own", "profile.own", "notifications.own", "reference.read"],
  STAFF: ["found.browse", "profile.own", "notifications.own", "reference.read", "operations.read", "matches.manage", "claims.process", "notifications.send"],
  ADMIN: ["found.browse", "profile.own", "notifications.own", "reference.read", "operations.read", "matches.manage", "claims.process", "notifications.send", "reference.manage", "users.manage", "sync.manage", "audit.read"]
} as const;
export type Permission = typeof ROLE_PERMISSIONS[Role][number];
export function hasPermission(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[] | undefined)?.includes(permission) ?? false;
}
export function requirePermission(user: { role: Role }, permission: Permission) {
  if (!hasPermission(user.role, permission)) throw new AppError("You do not have permission for this action", 403);
}

export function isStaffOrAdmin(role: Role): boolean {
  return hasPermission(role, "operations.read");
}

export function canManageReferenceData(role: Role): boolean {
  return hasPermission(role, "reference.manage");
}
