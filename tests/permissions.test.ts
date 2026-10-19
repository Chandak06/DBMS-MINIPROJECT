import { describe, expect, it } from "vitest";
import { canManageReferenceData, isStaffOrAdmin } from "@/lib/permissions";

describe("role permissions", () => {
  it("does not grant staff/admin privileges to students", () => {
    expect(isStaffOrAdmin("STUDENT")).toBe(false);
    expect(canManageReferenceData("STUDENT")).toBe(false);
  });

  it("grants master-data permission to staff and admin", () => {
    expect(canManageReferenceData("STAFF")).toBe(true);
    expect(canManageReferenceData("ADMIN")).toBe(true);
  });
});
