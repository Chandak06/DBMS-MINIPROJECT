import type { ResultSetHeader } from "mysql2";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  const { id } = await params;
  const notificationId = Number(id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) return apiError("Invalid notification id", 400);

  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "UPDATE NOTIFICATION SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
    [notificationId, session.userId]
  );
  if (result.affectedRows === 0) return apiError("Notification not found", 404);
  await tryWriteAuditEvent({ userId: session.userId, eventType: "NOTIFICATION_READ", entityType: "NOTIFICATION", entityId: notificationId });
  return NextResponse.json({ ok: true });
}
