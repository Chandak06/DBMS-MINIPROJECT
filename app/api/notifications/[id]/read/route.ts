import type { ResultSetHeader } from "mysql2";
import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { enqueueAuditEvent } from "@/lib/audit";
import { transaction } from "@/lib/transaction";
import { tryFlushMongoOutbox } from "@/lib/outbox";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async session=>{
  const { id } = await params;
  const notificationId = Number(id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) return apiError("Invalid notification id", 400);

  const response=await transaction(async connection=>{
  const [result] = await connection.execute<ResultSetHeader>(
    "UPDATE NOTIFICATION SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
    [notificationId, session.userId]
  );
  if (result.affectedRows === 0) return apiError("Notification not found", 404);
  await enqueueAuditEvent(connection,{ userId: session.userId, eventType: "NOTIFICATION_READ", entityType: "NOTIFICATION", entityId: notificationId });
  return NextResponse.json({ ok: true });
  });
  await tryFlushMongoOutbox();
  return response;
  });
}
