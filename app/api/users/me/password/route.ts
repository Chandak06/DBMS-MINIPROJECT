import {NextResponse} from "next/server";
import type {RowDataPacket} from "mysql2";
import {z} from "zod";
import {withUser} from "@/lib/api-route";
import {SESSION_COOKIE} from "@/lib/auth";
import {smallJson} from "@/lib/request-json";
import {verifyPassword,hashPassword,validPassword} from "@/lib/password.mjs";
import {mysqlPool} from "@/lib/mysql";
import {transaction} from "@/lib/transaction";
import {enqueueAuditEvent} from "@/lib/audit";
import {AppError} from "@/lib/errors";
export function POST(request:Request){return withUser(async actor=>{
 const parsed=z.object({currentPassword:z.string().max(128),newPassword:z.string().refine(validPassword)}).strict().safeParse(await smallJson(request));
 if(!parsed.success)throw new AppError("Supply current password and a 12–128 character new password");
 const [[user]]=await mysqlPool.execute<RowDataPacket[]>("SELECT password_hash,credential_version FROM USER WHERE user_id=?",[actor.userId]);
 if(!await verifyPassword(parsed.data.currentPassword,user.password_hash))throw new AppError("Current password is incorrect",403);
 const hash=await hashPassword(parsed.data.newPassword);
 await transaction(async connection=>{
  const [r]=await connection.execute<import("mysql2").ResultSetHeader>("UPDATE USER SET password_hash=?,credential_version=credential_version+1 WHERE user_id=? AND credential_version=?",[hash,actor.userId,user.credential_version]);
  if(!r.affectedRows)throw new AppError("Account changed. Sign in again.",409);
  await enqueueAuditEvent(connection,{userId:actor.userId,eventType:"PASSWORD_CHANGE",entityType:"USER",entityId:actor.userId});
 });
 const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,path:"/",maxAge:0});return response;
});}
