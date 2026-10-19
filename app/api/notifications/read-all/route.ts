import type { ResultSetHeader } from "mysql2";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";

export async function PATCH() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "UPDATE NOTIFICATION SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [session.userId]
  );
  await tryWriteAuditEvent({
    userId: session.userId,
    eventType: "NOTIFICATION_READ_ALL",
    entityType: "NOTIFICATION",
    payload: { affected_rows: result.affectedRows }
  });
  return NextResponse.json({ ok: true, updated: result.affectedRows });
}
