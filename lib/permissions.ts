import type { Role } from "./types";

export function isStaffOrAdmin(role: Role): boolean {
  return role === "STAFF" || role === "ADMIN";
}

export function canManageReferenceData(role: Role): boolean {
  return isStaffOrAdmin(role);
}
