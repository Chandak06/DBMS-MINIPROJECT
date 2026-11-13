import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { SessionUser } from "./types";
import { mysqlPool } from "./mysql";
import { transaction } from "./transaction";
import { enqueueMongo, tryFlushMongoOutbox, documentSyncState } from "./outbox";
import { AppError } from "./errors";
import { isStaffOrAdmin,requirePermission } from "./permissions";
import { lostItemCreateSchema, foundItemCreateSchema, lostItemUpdateSchema, foundItemUpdateSchema, itemDetailsSchema } from "./validations";
import { getMongoDb } from "./mongo";
import { enqueueAuditEvent } from "./audit";
import { requireTransition } from "./workflow";

export type Kind = "lost" | "found";
export function reportConfig(kind: Kind) {
  return kind === "lost" ? { table: "LOST_ITEM", id: "lost_id", date: "lost_datetime", field: "lostDatetime", collection: "lost_item_details" as const } :
    { table: "FOUND_ITEM", id: "found_id", date: "found_datetime", field: "foundDatetime", collection: "found_item_details" as const };
}
export async function listReports(kind: Kind, user: SessionUser, params = new URLSearchParams()) {
  const c = reportConfig(kind), where: string[] = [], values: (string|number|boolean|Date|null)[] = [];
  if(user.role!=="ADMIN"){where.push("l.campus_id=?");values.push(user.campusId??-1);}
  if (kind === "lost" && !isStaffOrAdmin(user.role) || params.get("mine") === "1") { where.push("i.reported_by = ?"); values.push(user.userId); }
  if (params.get("status")) {
    if (!["OPEN","MATCHED","CLOSED"].includes(params.get("status")!)) throw new AppError("Invalid status");
    where.push("i.status = ?"); values.push(params.get("status"));
  }
  if (params.get("q")?.trim()) {
    const q=params.get("q")!.trim().slice(0,200);
    if(params.get("searchMode")==="fulltext"){where.push("MATCH(i.item_name,i.description,i.brand) AGAINST(? IN NATURAL LANGUAGE MODE)");values.push(q);}
    else{where.push("(i.item_name LIKE ? OR i.description LIKE ? OR i.brand LIKE ?)");values.push(...Array(3).fill("%"+q+"%"));}
  }
  for (const [field, column] of [["categoryId","category_id"],["locationId","location_id"]]) {
    if (params.get(field)) { const id=Number(params.get(field)); if (!Number.isSafeInteger(id) || id<=0) throw new AppError("Invalid filter"); where.push("i."+column+" = ?"); values.push(id); }
  }
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    "SELECT i."+c.id+",i.item_name,i.description,i."+c.date+",i.color,i.brand,i.status,i.created_at,i.reported_by,i.category_id,i.location_id,c.category_name,l.location_name FROM "+c.table+" i JOIN CATEGORY c ON c.category_id=i.category_id JOIN LOCATION l ON l.location_id=i.location_id"+
    (where.length ? " WHERE "+where.join(" AND ") : "")+" ORDER BY i.created_at DESC, i."+c.id+" DESC LIMIT 500", values);
  return rows;
}
export async function getReport(kind: Kind, id: number, user: SessionUser) {
  const c=reportConfig(kind);
  const [rows]=await mysqlPool.execute<RowDataPacket[]>("SELECT i.*,c.category_name,l.location_name,l.building,l.campus_id FROM "+c.table+" i JOIN CATEGORY c ON c.category_id=i.category_id JOIN LOCATION l ON l.location_id=i.location_id WHERE i."+c.id+" = ?",[id]);
  const row=rows[0];
  if(row&&user.role!=="ADMIN"&&Number(row.campus_id)!==user.campusId)throw new AppError("Report not found",404);
  if (!row || kind==="lost" && row.reported_by!==user.userId && !isStaffOrAdmin(user.role)) throw new AppError("Report not found",404);
  if (kind==="found" && row.reported_by!==user.userId && !isStaffOrAdmin(user.role)) delete row.remarks;
  return row;
}
function detailsPayload(d: ReturnType<typeof itemDetailsSchema.parse>) {
  return { media:d.media, tags:d.tags, search_keywords:d.searchKeywords, extra_attributes:d.extraAttributes };
}
export async function createReport(kind: Kind, raw: unknown, user: SessionUser) {
  requirePermission(user,"reports.own");
  const c=reportConfig(kind);
  const parsed=(kind==="lost"?lostItemCreateSchema:foundItemCreateSchema).safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid report");
  const d=parsed.data;
  const date = new Date("lostDatetime" in d ? d.lostDatetime : d.foundDatetime);
  const id=await transaction(async connection=>{
    // Serialize duplicate detection for this reporter, including empty ranges.
    await connection.execute("SELECT user_id FROM `USER` WHERE user_id=? FOR UPDATE",[user.userId]);
    const [refs]=await connection.execute<RowDataPacket[]>("SELECT (SELECT category_id FROM CATEGORY WHERE category_id=?) AS category_ok,(SELECT location_id FROM LOCATION WHERE location_id=? AND campus_id=?) AS location_ok",[d.categoryId,d.locationId,user.campusId??-1]);
    if (!refs[0].category_ok || !refs[0].location_ok) throw new AppError("Category or location not found");
    const [duplicates]=await connection.execute<RowDataPacket[]>("SELECT "+c.id+" FROM "+c.table+" WHERE reported_by=? AND LOWER(item_name)=LOWER(?) AND status<>'CLOSED' AND "+c.date+" BETWEEN DATE_SUB(?,INTERVAL 10 MINUTE) AND DATE_ADD(?,INTERVAL 10 MINUTE) LIMIT 1",[user.userId,d.itemName,date,date]);
    if (duplicates.length) throw new AppError("A similar active report already exists",409);
    const [result]=await connection.execute<ResultSetHeader>("INSERT INTO "+c.table+" (item_name,description,"+c.date+",color,brand,status,remarks,reported_by,category_id,location_id) VALUES (?,?,?,?,?,'OPEN',?,?,?,?)",
      [d.itemName,d.description??null,date,d.color??null,d.brand??null,d.remarks??null,user.userId,d.categoryId,d.locationId]);
    await enqueueMongo(connection,c.collection,result.insertId,detailsPayload(d));
    await enqueueAuditEvent(connection,{userId:user.userId,eventType:c.table+"_CREATE",entityType:c.table,entityId:result.insertId});
    return result.insertId;
  });
  await tryFlushMongoOutbox();
  return { [kind==="lost"?"lostId":"foundId"]: id, enrichmentSaved:(await documentSyncState(c.collection,id))==="SYNCED" };
}
export async function updateReport(kind: Kind,id:number,raw:unknown,user:SessionUser) {
  requirePermission(user,"reports.own");
  const c=reportConfig(kind);
  const parsed=(kind==="lost"?lostItemUpdateSchema:foundItemUpdateSchema).safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid update");
  const d=parsed.data as Record<string,unknown>;
  const mapping:Record<string,string>={itemName:"item_name",description:"description",color:"color",brand:"brand",remarks:"remarks",categoryId:"category_id",locationId:"location_id",status:"status",[c.field]:c.date};
  const sets:string[]=[],values:(string|number|boolean|Date|null)[]=[];
  for(const [field,column] of Object.entries(mapping)) if (Object.prototype.hasOwnProperty.call(d,field)) { sets.push(column+"=?"); values.push(field===c.field?new Date(String(d[field])):(d[field]??null) as string|number|null); }
  const hasDetails=["tags","searchKeywords","media","extraAttributes"].some(k=>Object.prototype.hasOwnProperty.call(d,k));
  if(!sets.length&&!hasDetails) throw new AppError("No fields supplied");
  await transaction(async connection=>{
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT status FROM "+c.table+" WHERE "+c.id+"=? AND reported_by=? FOR UPDATE",[id,user.userId]);
    if(!rows[0]) throw new AppError("Report not found",404);
    if(rows[0].status!=="OPEN") throw new AppError("Only your OPEN reports can be edited",409);
    if(d.locationId){const [locations]=await connection.execute<RowDataPacket[]>("SELECT location_id FROM LOCATION WHERE location_id=? AND campus_id=?",[Number(d.locationId),user.campusId??-1]);if(!locations.length)throw new AppError("Choose a location in your registered college");}
    if(d.status) requireTransition("report",rows[0].status,String(d.status));
    await connection.execute("UPDATE "+c.table+" SET revision=revision+1"+(sets.length?", "+sets.join(","):"")+" WHERE "+c.id+"=?",[...values,id]);
    if(hasDetails) {
      const [events]=await connection.execute<RowDataPacket[]>("SELECT payload,operation FROM MONGO_OUTBOX WHERE collection_name=? AND document_id=? ORDER BY outbox_id DESC LIMIT 1",[c.collection,id]);
      let current:Record<string,unknown>={};
      if(events[0]?.operation==="UPSERT")current=typeof events[0].payload==="string"?JSON.parse(events[0].payload):events[0].payload;
      else if(!events.length)current=await (await getMongoDb()).collection(c.collection).findOne({[c.id]:id},{projection:{_id:0}})||{};
      const combined={tags:current.tags,searchKeywords:current.search_keywords,media:current.media,extraAttributes:current.extra_attributes};
      for(const key of ["tags","searchKeywords","media","extraAttributes"] as const)if(Object.prototype.hasOwnProperty.call(d,key))combined[key]=d[key];
      await enqueueMongo(connection,c.collection,id,detailsPayload(itemDetailsSchema.parse(combined)));
    }
    await enqueueAuditEvent(connection,{userId:user.userId,eventType:c.table+"_UPDATE",entityType:c.table,entityId:id});
    // Revision increments invalidate previously computed candidate scores.
    // Keep match history; review procedures reject stale revisions.
  });
  await tryFlushMongoOutbox();
  return {ok:true,enrichmentSaved:(await documentSyncState(c.collection,id))==="SYNCED"};
}
export async function deleteReport(kind:Kind,id:number,user:SessionUser) {
  requirePermission(user,"reports.own");
  const c=reportConfig(kind);
  await transaction(async connection=>{
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT status FROM "+c.table+" WHERE "+c.id+"=? AND reported_by=? FOR UPDATE",[id,user.userId]);
    if(!rows[0]) throw new AppError("Report not found",404);
    if(rows[0].status!=="OPEN") throw new AppError("Only your OPEN reports can be deleted",409);
    const [refs]=await connection.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM `MATCH` WHERE "+c.id+"=?",[id]);
    if(Number(refs[0].n)>0) throw new AppError("Match history exists. Close this report instead.",409);
    if(kind==="found") { const [claims]=await connection.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM CLAIM WHERE found_id=?",[id]); if(Number(claims[0].n)>0) throw new AppError("Claim history exists",409); }
    await connection.execute("DELETE FROM "+c.table+" WHERE "+c.id+"=?",[id]);
    await enqueueMongo(connection,c.collection,id,{},"DELETE");
    await enqueueAuditEvent(connection,{userId:user.userId,eventType:c.table+"_DELETE",entityType:c.table,entityId:id});
  });
  await tryFlushMongoOutbox();
}
export async function getDetails(kind:Kind,id:number,user:SessionUser) {
  await getReport(kind,id,user);
  const db=await getMongoDb(),c=reportConfig(kind);
  const doc=await db.collection(c.collection).findOne({[c.id]:id},{projection:{_id:0}});
  if(kind==="found" && doc && !isStaffOrAdmin(user.role)) {
    const report=await getReport(kind,id,user);
    if(report.reported_by!==user.userId) { delete doc.extra_attributes; delete doc.media; }
  }
  return doc;
}
export async function updateDetails(kind:Kind,id:number,raw:unknown,user:SessionUser,remove=false) {
  requirePermission(user,"reports.own");
  const c=reportConfig(kind),parsed=itemDetailsSchema.safeParse(raw);
  if(!remove&&!parsed.success) throw new AppError("Invalid item details");
  await transaction(async connection=>{
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT status FROM "+c.table+" WHERE "+c.id+"=? AND reported_by=? FOR UPDATE",[id,user.userId]);
    if(!rows[0]) throw new AppError("Report not found",404);
    if(rows[0].status!=="OPEN") throw new AppError("Only OPEN report details can be changed",409);
    await connection.execute("UPDATE "+c.table+" SET revision=revision+1 WHERE "+c.id+"=?",[id]);
    await enqueueMongo(connection,c.collection,id,parsed.success?detailsPayload(parsed.data):{},remove?"DELETE":"UPSERT");
    await enqueueAuditEvent(connection,{userId:user.userId,eventType:c.table+"_DETAILS_UPDATE",entityType:c.table,entityId:id});
    // Keep match history; review procedures reject stale revisions.
  });
  await tryFlushMongoOutbox();
  return {ok:true,enrichmentSaved:(await documentSyncState(c.collection,id))==="SYNCED"};
}


