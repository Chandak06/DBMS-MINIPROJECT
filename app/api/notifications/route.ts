import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";
import { isStaffOrAdmin } from "@/lib/permissions";
import { z } from "zod";

const createNotificationSchema = z.object({
  userId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(3000),
  type: z.enum(["MATCH", "CLAIM", "GENERAL"])
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT notification_id, title, message, type, is_read, created_at
       FROM NOTIFICATION
      WHERE user_id = ? ${unreadOnly ? "AND is_read = 0" : ""}
      ORDER BY created_at DESC, notification_id DESC`,
    [session.userId]
  );
  return NextResponse.json({ notifications: rows });
}


export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (!isStaffOrAdmin(session.role)) return apiError("Staff or Admin role required", 403);

  const parsed = createNotificationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid notification data", 400, parsed.error.flatten());

  const d = parsed.data;
  const [users] = await mysqlPool.execute<RowDataPacket[]>("SELECT user_id FROM `USER` WHERE user_id = ?", [d.userId]);
  if (!users[0]) return apiError("Target user not found", 400);

  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "INSERT INTO NOTIFICATION (title, message, type, user_id) VALUES (?, ?, ?, ?)",
    [d.title, d.message, d.type, d.userId]
  );
  await tryWriteAuditEvent({
    userId: session.userId,
    eventType: "NOTIFICATION_CREATE",
    entityType: "NOTIFICATION",
    entityId: result.insertId,
    payload: { target_user_id: d.userId, type: d.type }
  });
  return NextResponse.json({ notificationId: result.insertId }, { status: 201 });
}
