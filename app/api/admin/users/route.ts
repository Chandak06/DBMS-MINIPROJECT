import type { ResultSetHeader,RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { withPermission } from "@/lib/api-route";
import { mysqlPool } from "@/lib/mysql";
import { AppError } from "@/lib/errors";
import { userCreateSchema } from "@/lib/validations";
import { enqueueAuditEvent } from "@/lib/audit";
import { transaction } from "@/lib/transaction";
import { provisionAccount } from "@/lib/provisioning.mjs";
import { tryFlushMongoOutbox } from "@/lib/outbox";
export async function GET() {
 return withPermission("users.manage",async user=>{
  if(user.role!=="ADMIN") throw new AppError("Admin role required",403);
  const [users]=await mysqlPool.query<RowDataPacket[]>("SELECT u.user_id,u.first_name,u.last_name,u.email,u.role,d.department_name FROM `USER` u LEFT JOIN DEPARTMENT d ON d.department_id=u.department_id ORDER BY u.user_id LIMIT 500");
  return NextResponse.json({users});
 });
}
export async function POST(request:Request) {
 return withPermission("users.manage",async user=>{
  if(user.role!=="ADMIN") throw new AppError("Admin role required",403);
  const parsed=userCreateSchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success) throw new AppError(parsed.error.issues[0].message);
  const d=parsed.data;
  const id=await transaction(async connection=>{
  let r;
  try{r=await provisionAccount(connection,d);}catch(e){if((e as {code?:string}).code)throw e;throw new AppError(e instanceof Error?e.message:"Invalid college account");}
  await enqueueAuditEvent(connection,{userId:user.userId,eventType:"USER_CREATE",entityType:"USER",entityId:r.userId,payload:{role:d.role}});
  return r.userId;
  });
  await tryFlushMongoOutbox();
  return NextResponse.json({userId:id},{status:201});
 });
}
