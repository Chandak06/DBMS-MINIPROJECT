import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { enqueueAuditEvent } from "@/lib/audit";
import { transaction } from "@/lib/transaction";
import { tryFlushMongoOutbox } from "@/lib/outbox";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";

const createNotificationSchema = z.object({
  userId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(3000),
  type: z.enum(["MATCH", "CLAIM", "GENERAL"])
});

export async function GET(request: NextRequest) {
  return withUser(async session=>{

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT notification_id, title, message, type, is_read, created_at
       FROM NOTIFICATION
      WHERE user_id = ? ${unreadOnly ? "AND is_read = 0" : ""}
      ORDER BY created_at DESC, notification_id DESC`,
    [session.userId]
  );
  return NextResponse.json({ notifications: rows });
  });
}


export async function POST(request: Request) {
  return withUser(async session=>{
  requirePermission(session,"notifications.send");

  const parsed = createNotificationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid notification data", 400, parsed.error.flatten());

  const d = parsed.data;
  const [users] = await mysqlPool.execute<RowDataPacket[]>("SELECT u.user_id FROM USER u JOIN DEPARTMENT dep ON dep.department_id=u.department_id WHERE u.user_id=? AND (? IS NULL OR dep.campus_id=?)", [d.userId,session.role==="ADMIN"?null:session.campusId??-1,session.role==="ADMIN"?null:session.campusId??-1]);
  if (!users[0]) return apiError("Target user not found", 400);

  const response=await transaction(async connection=>{
  const [result] = await connection.execute<ResultSetHeader>(
    "INSERT INTO NOTIFICATION (title, message, type, user_id) VALUES (?, ?, ?, ?)",
    [d.title, d.message, d.type, d.userId]
  );
  await enqueueAuditEvent(connection,{
    userId: session.userId,
    eventType: "NOTIFICATION_CREATE",
    entityType: "NOTIFICATION",
    entityId: result.insertId,
    payload: { target_user_id: d.userId, type: d.type }
  });
  return NextResponse.json({ notificationId: result.insertId }, { status: 201 });
  });
  await tryFlushMongoOutbox();
  return response;
  });
}
