import type { SessionUser } from "./types";
import { getSession } from "./auth";
import { apiError } from "./http";
import { handleError } from "./errors";
import { requirePermission,type Permission } from "./permissions";
export async function withUser(work:(user:SessionUser)=>Promise<Response>) {
 try { const user=await getSession(); if(!user) return apiError("Authentication required",401); return await work(user); }
 catch(error) { return handleError(error); }
}
export function withPermission(permission:Permission,work:(user:SessionUser)=>Promise<Response>) {
 return withUser(async user=>{requirePermission(user,permission);return work(user);});
}
