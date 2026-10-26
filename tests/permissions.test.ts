import { describe, expect, it } from "vitest";
import { canManageReferenceData, isStaffOrAdmin,hasPermission,requirePermission,ROLE_PERMISSIONS } from "@/lib/permissions";
import type { Role } from "@/lib/types";

describe("role permissions", () => {
  it("does not grant staff/admin privileges to students", () => {
    expect(isStaffOrAdmin("STUDENT")).toBe(false);
    expect(canManageReferenceData("STUDENT")).toBe(false);
  });

  it("limits master-data changes to admin", () => {
    expect(canManageReferenceData("STAFF")).toBe(false);
    expect(canManageReferenceData("ADMIN")).toBe(true);
  });
  for(const role of ["STUDENT","STAFF","ADMIN"] as Role[]) {
    for(const permission of ROLE_PERMISSIONS.ADMIN) {
      it(role+" permission "+permission,()=>{
        const allowed=(ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
        expect(hasPermission(role,permission)).toBe(allowed);
        if(allowed)expect(()=>requirePermission({role},permission)).not.toThrow();
        else expect(()=>requirePermission({role},permission)).toThrow();
      });
    }
  }
});
