import {NextResponse} from "next/server";
import type {RowDataPacket} from "mysql2";
import {z} from "zod";
import {withPermission} from "@/lib/api-route";
import {positiveId,AppError} from "@/lib/errors";
import {transaction} from "@/lib/transaction";
import {enqueueAuditEvent} from "@/lib/audit";
export function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 return withPermission("users.manage",async actor=>{
  const id=positiveId((await params).id),parsed=z.object({active:z.boolean()}).strict().safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)throw new AppError("Supply active=true/false. Web role assignment is disabled.");
  await transaction(async connection=>{
   const [[user]]=await connection.execute<RowDataPacket[]>("SELECT role,password_hash FROM USER WHERE user_id=? FOR UPDATE",[id]);
   if(!user)throw new AppError("User not found",404);
   if(user.role==="ADMIN")throw new AppError("Admin accounts are managed only on the trusted setup system",403);
   if(parsed.data.active&&!user.password_hash)throw new AppError("Provision a password before enabling this account",409);
   await connection.execute("UPDATE USER SET auth_enabled=?,credential_version=credential_version+1 WHERE user_id=?",[parsed.data.active,id]);
   await enqueueAuditEvent(connection,{userId:actor.userId,eventType:parsed.data.active?"USER_ENABLE":"USER_DISABLE",entityType:"USER",entityId:id});
  });return NextResponse.json({ok:true});
 });
}
