import type { ResultSetHeader,RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { mysqlPool } from "@/lib/mysql";
import { AppError } from "@/lib/errors";
import { userCreateSchema } from "@/lib/validations";
import { tryWriteAuditEvent } from "@/lib/audit";
export async function GET() {
 return withUser(async user=>{
  if(user.role!=="ADMIN") throw new AppError("Admin role required",403);
  const [users]=await mysqlPool.query<RowDataPacket[]>("SELECT u.user_id,u.first_name,u.last_name,u.email,u.role,d.department_name FROM `USER` u LEFT JOIN DEPARTMENT d ON d.department_id=u.department_id ORDER BY u.user_id LIMIT 500");
  return NextResponse.json({users});
 });
}
export async function POST(request:Request) {
 return withUser(async user=>{
  if(user.role!=="ADMIN") throw new AppError("Admin role required",403);
  const parsed=userCreateSchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success) throw new AppError(parsed.error.issues[0].message);
  const d=parsed.data;
  const [r]=await mysqlPool.execute<ResultSetHeader>("INSERT INTO `USER` (first_name,last_name,email,role,department_id) VALUES (?,?,?,?,?)",[d.firstName,d.lastName,d.email,d.role,d.departmentId]);
  await tryWriteAuditEvent({userId:user.userId,eventType:"USER_CREATE",entityType:"USER",entityId:r.insertId,payload:{role:d.role}});
  return NextResponse.json({userId:r.insertId},{status:201});
 });
}
