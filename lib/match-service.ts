import type { RowDataPacket,ResultSetHeader } from "mysql2";
import type { SessionUser } from "./types";
import { mysqlPool } from "./mysql";
import { getMongoDb } from "./mongo";
import { transaction } from "./transaction";
import { enqueueMongo,tryFlushMongoOutbox } from "./outbox";
import { compareItems,MATCH_THRESHOLD, type MatchItem } from "./matching";
import { AppError } from "./errors";
import { isStaffOrAdmin } from "./permissions";
import { tryWriteAuditEvent } from "./audit";
export function requireStaff(user:SessionUser) { if(!isStaffOrAdmin(user.role)) throw new AppError("Staff or Admin role required",403); }
export async function listMatches(user:SessionUser,status="") {
 const where:string[]=[],values:(string|number|boolean|Date|null)[]=[];
 if(!isStaffOrAdmin(user.role)) { where.push("li.reported_by=?");values.push(user.userId); }
 if(status) { if(!["PENDING","ACCEPTED","REJECTED"].includes(status)) throw new AppError("Invalid status");where.push("m.status=?");values.push(status); }
 const [rows]=await mysqlPool.execute<RowDataPacket[]>(
  "SELECT m.*,li.item_name AS lost_name,fi.item_name AS found_name,li.reported_by AS owner_id,li.status AS lost_status,fi.status AS found_status,li.revision AS current_lost_revision,fi.revision AS current_found_revision FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id JOIN FOUND_ITEM fi ON fi.found_id=m.found_id"+
  (where.length?" WHERE "+where.join(" AND "):"")+" ORDER BY m.status='PENDING' DESC,m.similarity_score DESC,m.match_id DESC LIMIT 500",values);
 return rows;
}
export async function getMatch(user:SessionUser,id:number) {
 const [rows]=await mysqlPool.execute<RowDataPacket[]>(
  "SELECT m.*,li.item_name AS lost_name,fi.item_name AS found_name,li.reported_by AS owner_id,li.status AS lost_status,fi.status AS found_status,li.revision AS current_lost_revision,fi.revision AS current_found_revision FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id JOIN FOUND_ITEM fi ON fi.found_id=m.found_id WHERE m.match_id=?",[id]);
 if(!rows[0]||!isStaffOrAdmin(user.role)&&rows[0].owner_id!==user.userId) throw new AppError("Match not found",404);
 return rows[0];
}
async function candidateRows(lostId?:number,foundId?:number) {
 const values:(string|number|boolean|Date|null)[]=[],filters=["li.status='OPEN'","fi.status='OPEN'","fi.category_id=li.category_id","fl.campus_id=ll.campus_id","fi.found_datetime BETWEEN DATE_SUB(li.lost_datetime,INTERVAL 5 MINUTE) AND DATE_ADD(li.lost_datetime,INTERVAL 14 DAY)"];
 if(lostId) {filters.push("li.lost_id=?");values.push(lostId);}
 if(foundId) {filters.push("fi.found_id=?");values.push(foundId);}
 const [rows]=await mysqlPool.execute<RowDataPacket[]>(
  "SELECT li.lost_id,fi.found_id,li.item_name AS lost_name,fi.item_name AS found_name,li.description AS lost_description,fi.description AS found_description,li.color AS lost_color,fi.color AS found_color,li.brand AS lost_brand,fi.brand AS found_brand,li.category_id,li.location_id AS lost_location,fi.location_id AS found_location,ll.campus_id,li.lost_datetime,fi.found_datetime,li.revision AS lost_revision,fi.revision AS found_revision FROM LOST_ITEM li JOIN LOCATION ll ON ll.location_id=li.location_id JOIN FOUND_ITEM fi ON fi.category_id=li.category_id JOIN LOCATION fl ON fl.location_id=fi.location_id WHERE "+filters.join(" AND ")+" ORDER BY li.lost_id,fi.found_id LIMIT 2001",values);
 if(rows.length>2000) throw new AppError("Too many candidates. Generate matches for one lost report at a time.",400);
 return rows;
}
export async function generateMatches(user:SessionUser,lostId?:number,foundId?:number) {
 requireStaff(user);
 const sync=await tryFlushMongoOutbox();
 if(sync.pending!==0) throw new AppError("MongoDB details are awaiting synchronization. Retry after syncing.",503);
 const rows=await candidateRows(lostId,foundId);
 if(lostId&&foundId&&!rows.length) throw new AppError("Reports must be OPEN, share a category/campus, and be within 14 days",409);
 const db=await getMongoDb();
 const lostIds=[...new Set(rows.map(r=>r.lost_id))],foundIds=[...new Set(rows.map(r=>r.found_id))];
 const [lostDocs,foundDocs]=await Promise.all([
  db.collection("lost_item_details").find({lost_id:{$in:lostIds}}).toArray(),
  db.collection("found_item_details").find({found_id:{$in:foundIds}}).toArray()
 ]);
 const lostMap=new Map(lostDocs.map(d=>[d.lost_id,d])),foundMap=new Map(foundDocs.map(d=>[d.found_id,d]));
 const saved:number[]=[];
 for(const row of rows) {
  const lost:MatchItem={item_name:row.lost_name,description:row.lost_description,color:row.lost_color,brand:row.lost_brand,category_id:row.category_id,location_id:row.lost_location,campus_id:row.campus_id,datetime:row.lost_datetime,tags:lostMap.get(row.lost_id)?.tags,search_keywords:lostMap.get(row.lost_id)?.search_keywords};
  const found:MatchItem={item_name:row.found_name,description:row.found_description,color:row.found_color,brand:row.found_brand,category_id:row.category_id,location_id:row.found_location,campus_id:row.campus_id,datetime:row.found_datetime,tags:foundMap.get(row.found_id)?.tags,search_keywords:foundMap.get(row.found_id)?.search_keywords};
  const comparison=compareItems(lost,found);
  const manual=Boolean(lostId&&foundId);
  if(!comparison.eligible||!manual&&comparison.score<MATCH_THRESHOLD) continue;
  const id=await transaction(async connection=>{
   const [l]=await connection.execute<RowDataPacket[]>("SELECT status,revision FROM LOST_ITEM WHERE lost_id=? FOR UPDATE",[row.lost_id]);
   const [f]=await connection.execute<RowDataPacket[]>("SELECT status,revision FROM FOUND_ITEM WHERE found_id=? FOR UPDATE",[row.found_id]);
   if(l[0]?.status!=="OPEN"||f[0]?.status!=="OPEN"||l[0].revision!==row.lost_revision||f[0].revision!==row.found_revision) return null;
   const [existing]=await connection.execute<RowDataPacket[]>("SELECT match_id,status FROM `MATCH` WHERE lost_id=? AND found_id=? FOR UPDATE",[row.lost_id,row.found_id]);
   if(existing[0]&&existing[0].status!=="PENDING") return null;
   let matchId=existing[0]?.match_id;
   if(matchId) await connection.execute("UPDATE `MATCH` SET similarity_score=?,match_method=?,lost_revision=?,found_revision=?,matched_at=UTC_TIMESTAMP() WHERE match_id=?",[comparison.score,manual?"MANUAL":"HYBRID",row.lost_revision,row.found_revision,matchId]);
   else { const [result]=await connection.execute<ResultSetHeader>("INSERT INTO `MATCH` (lost_id,found_id,similarity_score,match_method,status,lost_revision,found_revision) VALUES (?,?,?,?,'PENDING',?,?)",[row.lost_id,row.found_id,comparison.score,manual?"MANUAL":"HYBRID",row.lost_revision,row.found_revision]);matchId=result.insertId; }
   await enqueueMongo(connection,"match_evidence",matchId,{matched_tags:comparison.matchedTags,rule_scores:comparison.ruleScores,score:comparison.score,explanation:comparison.explanation,evidence:{lost,found,lost_revision:row.lost_revision,found_revision:row.found_revision,algorithm:"weighted-rules-v1"}});
   return Number(matchId);
  });
  if(id) saved.push(id);
 }
 const evidenceSync=await tryFlushMongoOutbox();
 await tryWriteAuditEvent({userId:user.userId,eventType:"MATCH_GENERATE",entityType:"MATCH",payload:{candidate_count:rows.length,match_ids:saved}});
 return {candidateCount:rows.length,matchIds:saved,evidenceSaved:evidenceSync.pending===0};
}
export async function reviewMatch(user:SessionUser,id:number,status:string,remarks:string) {
 requireStaff(user);
 await getMatch(user,id);
 await mysqlPool.execute("CALL sp_review_match(?,?,?,?)",[id,user.userId,status,remarks]);
 await tryWriteAuditEvent({userId:user.userId,eventType:"MATCH_"+status,entityType:"MATCH",entityId:id,payload:{remarks}});
}

