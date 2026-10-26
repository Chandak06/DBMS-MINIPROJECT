import type { RowDataPacket } from "mysql2";
import type { Document } from "mongodb";
import { mysqlPool } from "./mysql";
import { getMongoDb } from "./mongo";
import { AppError } from "./errors";
import { itemDetailsSchema } from "./validations";

// MongoDB is the read model; committed SQL events are the recovery source.
// Never score stale Mongo tags against a newer relational report revision.
export async function detailSnapshots(collection: "lost_item_details"|"found_item_details", ids: number[]) {
  const key = collection === "lost_item_details" ? "lost_id" : "found_id";
  const snapshots = new Map<number,Document>();
  if (!ids.length) return snapshots;
  let mongoAvailable = true;
  try {
    const docs = await (await getMongoDb()).collection(collection).find({[key]:{$in:ids}}).toArray();
    for (const doc of docs) snapshots.set(Number(doc[key]),doc);
  } catch { mongoAvailable = false; }
  const [rows] = await mysqlPool.query<RowDataPacket[]>(`SELECT o.document_id,o.payload,o.operation FROM MONGO_OUTBOX o
    JOIN (SELECT document_id,MAX(outbox_id) latest FROM MONGO_OUTBOX WHERE collection_name=? AND document_id IN (?) GROUP BY document_id) x ON x.latest=o.outbox_id`,[collection,ids]);
  const recorded = new Set<number>();
  for (const row of rows) {
    const id = Number(row.document_id);
    recorded.add(id);
    if (row.operation === "DELETE") { snapshots.set(id,{}); continue; }
    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    const valid = itemDetailsSchema.safeParse({tags:payload.tags,searchKeywords:payload.search_keywords,media:payload.media,extraAttributes:payload.extra_attributes});
    if (!valid.success) throw new AppError("This report has invalid saved details. An Admin must inspect its synchronization record.",503);
    snapshots.set(id,payload);
  }
  if (!mongoAvailable && ids.some(id=>!recorded.has(id))) throw new AppError("MongoDB is unavailable and some report details have no recovery snapshot. Retry when the connection is restored.",503);
  return snapshots;
}
