export const MAX_ATTEMPTS = 8;
export const COLLECTION_KEYS = { lost_item_details: "lost_id", found_item_details: "found_id", match_evidence: "match_id", audit_events: "event_id" };
export function diagnostic(error) {
  return [error?.name || "Error", error?.code, error?.sqlState].filter(Boolean).join(": ").slice(0, 200);
}
export function classifyFailure(error, attempts) {
  if ([121, 2, 9, 13, 18].includes(Number(error?.code)) || error instanceof SyntaxError || error?.permanent) return "PERMANENT";
  return attempts >= MAX_ATTEMPTS ? "EXHAUSTED" : "TRANSIENT";
}
export function retryDelay(attempts) { return Math.min(3600, 5 * 2 ** Math.max(0, attempts - 1)); }
export function utcDate(value) {
  if (value instanceof Date) return value;
  const s = String(value);
  const date = new Date(s.replace(" ", "T") + (/(?:Z|[+-]\d{2}:\d{2})$/i.test(s) ? "" : "Z"));
  if (!Number.isFinite(date.getTime())) throw Object.assign(new Error("Invalid timestamp"), { permanent: true });
  return date;
}
export async function outboxHealth(connection) {
  const [[row]] = await connection.query(`SELECT COUNT(*) AS pending,
    COALESCE(SUM(failure_kind IN ('PERMANENT','EXHAUSTED')),0) AS failed,
    COALESCE(SUM(failure_kind IS NULL OR failure_kind='TRANSIENT'),0) AS retryable
    FROM MONGO_OUTBOX WHERE processed_at IS NULL`);
  return { pending: Number(row.pending), failed: Number(row.failed), retryable: Number(row.retryable) };
}
export async function replayOutbox(connection, getDb, limit = 1000) {
  const [[lock]] = await connection.query("SELECT GET_LOCK('clf_mongo_outbox',0) AS acquired");
  if (Number(lock.acquired) !== 1) return { processed: 0, busy: true, ...(await outboxHealth(connection)) };
  let processed = 0;
  const seen = new Set();
  try {
    // Per-document FIFO prevents stale replay without blocking unrelated writes.
    for (let i = 0; i < Math.min(10000, Math.max(1, Math.trunc(limit))); i++) {
      const [rows] = await connection.query(`SELECT o.* FROM MONGO_OUTBOX o
        WHERE o.processed_at IS NULL AND (o.failure_kind IS NULL OR o.failure_kind='TRANSIENT')
        AND (o.next_attempt_at IS NULL OR o.next_attempt_at<=UTC_TIMESTAMP())
        AND NOT EXISTS (SELECT 1 FROM MONGO_OUTBOX earlier WHERE earlier.collection_name=o.collection_name
          AND earlier.document_id=o.document_id AND earlier.outbox_id<o.outbox_id AND earlier.processed_at IS NULL)
        ORDER BY o.outbox_id LIMIT 1`);
      const row = rows[0];
      if (!row || seen.has(row.outbox_id)) break;
      seen.add(row.outbox_id);
      try {
        const key = COLLECTION_KEYS[row.collection_name];
        if (!key || !["UPSERT", "DELETE"].includes(row.operation)) throw Object.assign(new Error("Invalid outbox operation"), { permanent: true });
        const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
        const timestamp = utcDate(row.created_at);
        const id = row.collection_name === "audit_events" ? "outbox:" + row.outbox_id : Number(row.document_id);
        const db = await getDb();
        if (row.operation === "DELETE") await db.collection(row.collection_name).deleteOne({ [key]: id });
        else {
          const data = { ...payload, [key]: id, updated_at: timestamp };
          delete data._id; delete data.created_at;
          if (row.collection_name === "audit_events") data.occurred_at = payload.occurred_at ? utcDate(payload.occurred_at) : timestamp;
          await db.collection(row.collection_name).updateOne({ [key]: id }, { $set: data, $setOnInsert: { created_at: timestamp } }, { upsert: true });
        }
        await connection.execute("UPDATE MONGO_OUTBOX SET processed_at=UTC_TIMESTAMP(),last_error=NULL,failure_kind=NULL,next_attempt_at=NULL WHERE outbox_id=? AND processed_at IS NULL", [row.outbox_id]);
        processed++;
      } catch (error) {
        const attempts = Number(row.attempts) + 1;
        const kind = classifyFailure(error, attempts);
        await connection.execute("UPDATE MONGO_OUTBOX SET attempts=?,last_error=?,failure_kind=?,next_attempt_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND) WHERE outbox_id=? AND processed_at IS NULL", [attempts, diagnostic(error), kind, retryDelay(attempts), row.outbox_id]);
        console.error("Mongo synchronization deferred", { outboxId: row.outbox_id, collection: row.collection_name, kind, diagnostic: diagnostic(error) });
        if (kind === "TRANSIENT" && /Mongo(Network|ServerSelection)|ENOTFOUND|ECONN|ETIME/i.test(diagnostic(error))) break;
      }
    }
    return { processed, busy: false, ...(await outboxHealth(connection)) };
  } finally { await connection.query("SELECT RELEASE_LOCK('clf_mongo_outbox')"); }
}
