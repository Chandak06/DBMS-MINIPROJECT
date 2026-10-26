import { notFound } from "next/navigation";
import { requireSession } from "./auth";
import { hasPermission,type Permission } from "./permissions";
export async function requirePagePermission(permission:Permission) {
 const user=await requireSession();
 if(!hasPermission(user.role,permission))notFound();
 return user;
}
