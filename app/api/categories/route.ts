import { NextResponse } from "next/server";
import type { ResultSetHeader,RowDataPacket } from "mysql2";
import { withUser } from "@/lib/api-route";
import { mysqlPool } from "@/lib/mysql";
import { requireStaff } from "@/lib/match-service";
import { AppError } from "@/lib/errors";
import { categoryCreateSchema } from "@/lib/validations";
import { tryWriteAuditEvent } from "@/lib/audit";
export async function GET() { return withUser(async ()=>{const [rows]=await mysqlPool.query<RowDataPacket[]>("SELECT * FROM CATEGORY ORDER BY category_name");return NextResponse.json({categories:rows});}); }
export async function POST(request:Request) {
 return withUser(async user=>{requireStaff(user);const parsed=categoryCreateSchema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success) throw new AppError("Invalid category data");
 const d=parsed.data; const [r]=await mysqlPool.execute<ResultSetHeader>("INSERT INTO CATEGORY(category_name,description) VALUES (?,?)",[d.categoryName,d.description??null]);
 await tryWriteAuditEvent({userId:user.userId,eventType:"CATEGORY_CREATE",entityType:"CATEGORY",entityId:r.insertId});
 return NextResponse.json({categoryId:r.insertId},{status:201});});
}
