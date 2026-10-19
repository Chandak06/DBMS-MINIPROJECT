import { NextResponse } from "next/server";
import type { ResultSetHeader,RowDataPacket } from "mysql2";
import { withUser } from "@/lib/api-route";
import { mysqlPool } from "@/lib/mysql";
import { requireStaff } from "@/lib/match-service";
import { AppError } from "@/lib/errors";
import { locationCreateSchema } from "@/lib/validations";
import { tryWriteAuditEvent } from "@/lib/audit";
export async function GET() { return withUser(async ()=>{const [rows]=await mysqlPool.query<RowDataPacket[]>("SELECT * FROM LOCATION ORDER BY location_name");return NextResponse.json({locations:rows});}); }
export async function POST(request:Request) {
 return withUser(async user=>{requireStaff(user);const parsed=locationCreateSchema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success) throw new AppError("Invalid location data");
 const d=parsed.data; const [r]=await mysqlPool.execute<ResultSetHeader>("INSERT INTO LOCATION(location_name,building,floor,area,type,campus_id) VALUES (?,?,?,?,?,?)",[d.locationName,d.building??null,d.floor??null,d.area??null,d.type??null,d.campusId]);
 await tryWriteAuditEvent({userId:user.userId,eventType:"LOCATION_CREATE",entityType:"LOCATION",entityId:r.insertId});
 return NextResponse.json({locationId:r.insertId},{status:201});});
}
