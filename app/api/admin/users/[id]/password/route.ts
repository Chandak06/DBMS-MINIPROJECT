import {NextResponse} from "next/server";
import type {RowDataPacket} from "mysql2";
import {z} from "zod";
import {withPermission} from "@/lib/api-route";
import {positiveId,AppError} from "@/lib/errors";
import {smallJson} from "@/lib/request-json";
import {hashPassword,validPassword} from "@/lib/password.mjs";
import {transaction} from "@/lib/transaction";
import {enqueueAuditEvent} from "@/lib/audit";
export function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 return withPermission("users.manage",async actor=>{
  const id=positiveId((await params).id),parsed=z.object({password:z.string().refine(validPassword)}).strict().safeParse(await smallJson(request));
  if(!parsed.success)throw new AppError("Use a 12–128 character password");
  const passwordHash=await hashPassword(parsed.data.password);
  await transaction(async connection=>{
   const [[user]]=await connection.execute<RowDataPacket[]>("SELECT role FROM USER WHERE user_id=? FOR UPDATE",[id]);
   if(!user)throw new AppError("User not found",404);if(user.role==="ADMIN")throw new AppError("Admin credentials are managed only on the trusted setup system",403);
   await connection.execute("UPDATE USER SET password_hash=?,credential_version=credential_version+1,failed_login_attempts=0,locked_until=NULL WHERE user_id=?",[passwordHash,id]);
   await enqueueAuditEvent(connection,{userId:actor.userId,eventType:"USER_PASSWORD_RESET",entityType:"USER",entityId:id});
  });return NextResponse.json({ok:true});
 });
}
