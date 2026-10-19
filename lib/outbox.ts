import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mysqlPool } from "./mysql";
import { getMongoDb } from "./mongo";
const collections = ["lost_item_details", "found_item_details", "match_evidence"] as const;
type Collection = typeof collections[number];
export async function enqueueMongo(connection: PoolConnection, collection: Collection, id: number, payload: Record<string, unknown>, operation: "UPSERT" | "DELETE" = "UPSERT") {
  await connection.execute<ResultSetHeader>(
    "INSERT INTO MONGO_OUTBOX (collection_name, document_id, payload, operation) VALUES (?, ?, ?, ?)",
    [collection, id, JSON.stringify(payload), operation]
  );
}
export async function flushMongoOutbox(limit = 100) {
  const connection = await mysqlPool.getConnection();
  let processed = 0;
  let pending = 0;
  try {
    // One worker at a time preserves update/delete order for each document.
    const [lock] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('clf_mongo_outbox', 0) AS acquired");
    if (Number(lock[0].acquired) !== 1) return { processed, pending: -1 };
    const db = await getMongoDb();
    const [rows] = await connection.execute<RowDataPacket[]>("SELECT * FROM MONGO_OUTBOX WHERE processed_at IS NULL ORDER BY outbox_id LIMIT " + Math.min(1000, Math.max(1, Math.trunc(limit))));
    for (const row of rows) {
      try {
        if (!collections.includes(row.collection_name)) throw new Error("Unknown collection");
        const key = row.collection_name === "lost_item_details" ? "lost_id" : row.collection_name === "found_item_details" ? "found_id" : "match_id";
        const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
        if (row.operation === "DELETE") await db.collection(row.collection_name).deleteOne({ [key]: row.document_id });
        else await db.collection(row.collection_name).updateOne({ [key]: row.document_id }, {
          $set: { ...payload, [key]: row.document_id, updated_at: new Date(row.created_at.replace(" ", "T") + "Z") },
          $setOnInsert: { created_at: new Date(row.created_at.replace(" ", "T") + "Z") }
        }, { upsert: true });
        await connection.execute("UPDATE MONGO_OUTBOX SET processed_at = NOW(), last_error = NULL WHERE outbox_id = ?", [row.outbox_id]);
        processed++;
      } catch (error) {
        await connection.execute("UPDATE MONGO_OUTBOX SET attempts = attempts + 1, last_error = ? WHERE outbox_id = ?", [String(error).slice(0, 500), row.outbox_id]);
        break; // Do not replay later writes ahead of a failed earlier write.
      }
    }
    const [counts] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM MONGO_OUTBOX WHERE processed_at IS NULL");
    pending = Number(counts[0].n);
    return { processed, pending };
  } finally {
    await connection.query("SELECT RELEASE_LOCK('clf_mongo_outbox')").catch(() => {});
    connection.release();
  }
}
export async function tryFlushMongoOutbox() {
  try { return await flushMongoOutbox(); }
  catch (error) { console.error("Mongo sync deferred", String(error)); return { processed: 0, pending: -1 }; }
}
