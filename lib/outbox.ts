import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { mysqlPool } from "./mysql";
import { getMongoDb } from "./mongo";
import { replayOutbox } from "./outbox-worker.mjs";
import { safeDiagnostic } from "./diagnostics";
export type OutboxCollection = "lost_item_details" | "found_item_details" | "match_evidence" | "audit_events";
export async function enqueueMongo(connection: PoolConnection, collection: OutboxCollection, id: number, payload: Record<string, unknown>, operation: "UPSERT" | "DELETE" = "UPSERT") {
  await connection.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload,operation) VALUES (?,?,?,?)", [collection,id,JSON.stringify(payload),operation]);
}
export async function flushMongoOutbox(limit = 100) {
  const connection = await mysqlPool.getConnection();
  try { return await replayOutbox(connection, getMongoDb, limit); }
  finally { connection.release(); }
}
export async function tryFlushMongoOutbox() {
  try { return await flushMongoOutbox(); }
  catch (error) { console.error("Mongo synchronization unavailable", safeDiagnostic(error)); return { processed:0, pending:-1, failed:0, retryable:0, busy:false }; }
}
export async function documentSyncState(collection: OutboxCollection, id: number) {
  const [rows] = await mysqlPool.execute<RowDataPacket[]>("SELECT outbox_id,failure_kind,attempts FROM MONGO_OUTBOX WHERE collection_name=? AND document_id=? AND processed_at IS NULL ORDER BY outbox_id LIMIT 1", [collection,id]);
  return !rows[0] ? "SYNCED" : ["PERMANENT","EXHAUSTED"].includes(rows[0].failure_kind) ? "FAILED" : "PENDING";
}
