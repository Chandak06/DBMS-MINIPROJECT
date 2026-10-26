import type { ResultSetHeader } from "mysql2";
import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { enqueueAuditEvent } from "@/lib/audit";
import { transaction } from "@/lib/transaction";
import { tryFlushMongoOutbox } from "@/lib/outbox";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";

export async function PATCH() {
  return withUser(async session=>{
  const response=await transaction(async connection=>{
  const [result] = await connection.execute<ResultSetHeader>(
    "UPDATE NOTIFICATION SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [session.userId]
  );
  await enqueueAuditEvent(connection,{
    userId: session.userId,
    eventType: "NOTIFICATION_READ_ALL",
    entityType: "NOTIFICATION",
    payload: { affected_rows: result.affectedRows }
  });
  return NextResponse.json({ ok: true, updated: result.affectedRows });
  });
  await tryFlushMongoOutbox();
  return response;
  });
}
