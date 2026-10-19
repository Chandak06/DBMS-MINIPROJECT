import { NextRequest,NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { demoLoginEnabled } from "@/lib/demo-auth";
import { createSessionToken,SESSION_COOKIE } from "@/lib/auth";
import { mysqlPool } from "@/lib/mysql";
import { apiError } from "@/lib/http";
import { handleError } from "@/lib/errors";
import { tryWriteAuditEvent } from "@/lib/audit";
import type { Role } from "@/lib/types";
export async function POST(request:NextRequest) {
 if(!demoLoginEnabled()||!["localhost","127.0.0.1","[::1]"].includes(request.nextUrl.hostname)) return apiError("Demo sign-in is disabled",404);
 const raw=await request.json().catch(()=>({}));
 const emails:Record<string,string|undefined>={STUDENT:process.env.DEMO_STUDENT_EMAIL,STAFF:process.env.DEMO_STAFF_EMAIL,ADMIN:process.env.DEMO_ADMIN_EMAIL};
 if(!raw || typeof raw !== "object" || !Object.prototype.hasOwnProperty.call(emails,raw.role)||!emails[raw.role]) return apiError("Demo role is not configured");
 try {
  const [rows]=await mysqlPool.execute<RowDataPacket[]>("SELECT user_id,email,role FROM `USER` WHERE email=? AND role=?",[emails[raw.role],raw.role]);
  if(!rows[0]) return apiError("Run npm run seed to provision this demo account",409);
  const row=rows[0],token=await createSessionToken({userId:row.user_id,email:row.email,role:row.role as Role});
  const response=NextResponse.json({ok:true});
  response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",secure:false,path:"/",maxAge:8*3600});
  await tryWriteAuditEvent({userId:row.user_id,eventType:"LOGIN_DEMO",entityType:"USER",entityId:row.user_id});
  return response;
 } catch(error) {return handleError(error);}
}

