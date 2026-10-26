import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { withPermission } from "@/lib/api-route";
import { positiveId,AppError } from "@/lib/errors";
import { transaction } from "@/lib/transaction";
import { enqueueAuditEvent } from "@/lib/audit";
import { tryFlushMongoOutbox } from "@/lib/outbox";
const schema=z.object({role:z.enum(["STUDENT","STAFF","ADMIN"])}).strict();
export function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 return withPermission("users.manage",async actor=>{
  const id=positiveId((await params).id),parsed=schema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)throw new AppError("Supply a valid role");
  if(id===actor.userId)throw new AppError("You cannot change your own role",403);
  await transaction(async connection=>{
   const [users]=await connection.execute<RowDataPacket[]>("SELECT user_id,role FROM `USER` WHERE role='ADMIN' OR user_id=? ORDER BY user_id FOR UPDATE",[id]);
   if(!users.some(u=>u.user_id===actor.userId&&u.role==="ADMIN"))throw new AppError("Admin permission was revoked",403);
   const target=users.find(u=>u.user_id===id);
   if(!target)throw new AppError("User not found",404);
   if(target.role===parsed.data.role)return;
   await connection.execute("UPDATE `USER` SET role=? WHERE user_id=?",[parsed.data.role,id]);
   await enqueueAuditEvent(connection,{userId:actor.userId,eventType:"USER_ROLE_CHANGE",entityType:"USER",entityId:id,payload:{from:target.role,to:parsed.data.role}});
  });
  await tryFlushMongoOutbox();return NextResponse.json({ok:true});
 });
}
