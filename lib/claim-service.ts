import type { RowDataPacket,ResultSetHeader } from "mysql2";
import type { SessionUser } from "./types";
import { mysqlPool } from "./mysql";
import { transaction } from "./transaction";
import { AppError } from "./errors";
import { isStaffOrAdmin } from "./permissions";
import { requireStaff } from "./match-service";
import { tryWriteAuditEvent } from "./audit";
import { claimCreateSchema } from "./validations";
export async function listClaims(user:SessionUser,status="",id?:number) {
 const where:string[]=[],values:(string|number|boolean|Date|null)[]=[];
 if(!isStaffOrAdmin(user.role)) {where.push("cl.submitted_by=?");values.push(user.userId);}
 if(status) {if(!["PENDING","APPROVED","REJECTED"].includes(status)) throw new AppError("Invalid status");where.push("cl.status=?");values.push(status);}
 if(id) {where.push("cl.claim_id=?");values.push(id);}
 const [rows]=await mysqlPool.execute<RowDataPacket[]>("SELECT cl.*,fi.item_name,CONCAT_WS(' ',u.first_name,u.last_name) AS claimant_name,p.email AS processor_email FROM CLAIM cl JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id JOIN `USER` u ON u.user_id=cl.submitted_by LEFT JOIN `USER` p ON p.user_id=cl.processed_by"+
  (where.length?" WHERE "+where.join(" AND "):"")+" ORDER BY cl.status='PENDING' DESC,cl.created_at DESC LIMIT 500",values);
 return rows;
}
export async function createClaim(user:SessionUser,raw:unknown) {
 const parsed=claimCreateSchema.safeParse(raw);
 if(!parsed.success) throw new AppError(parsed.error.issues[0]?.message??"Invalid claim");
 const d=parsed.data;
 const id=await transaction(async connection=>{
  const [matches]=await connection.execute<RowDataPacket[]>("SELECT m.lost_id,li.reported_by FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id WHERE m.found_id=? AND m.status='ACCEPTED'",[d.foundId]);
  if(!matches[0]||matches[0].reported_by!==user.userId) throw new AppError("You need an accepted match for your own lost report before claiming this item",403);
  const [lost]=await connection.execute<RowDataPacket[]>("SELECT status FROM LOST_ITEM WHERE lost_id=? FOR UPDATE",[matches[0].lost_id]);
  const [found]=await connection.execute<RowDataPacket[]>("SELECT status FROM FOUND_ITEM WHERE found_id=? FOR UPDATE",[d.foundId]);
  if(lost[0]?.status!=="MATCHED"||found[0]?.status!=="MATCHED") throw new AppError("Item is no longer available",409);
  const [result]=await connection.execute<ResultSetHeader>("INSERT INTO CLAIM (claim_description,status,claim_remarks,submitted_by,found_id) VALUES (?,'PENDING',?,?,?)",[d.claimDescription,d.claimRemarks??null,user.userId,d.foundId]);
  await connection.execute("INSERT INTO NOTIFICATION(title,message,type,user_id) SELECT 'New ownership claim',?,'CLAIM',user_id FROM `USER` WHERE role IN ('STAFF','ADMIN')",["Claim #"+result.insertId+" is awaiting ownership verification."]);
  return result.insertId;
 });
 await tryWriteAuditEvent({userId:user.userId,eventType:"CLAIM_CREATE",entityType:"CLAIM",entityId:id});
 return id;
}
export async function processClaim(user:SessionUser,id:number,status:string,remarks:string) {
 requireStaff(user);
 const claims=await listClaims(user,"",id);
 if(!claims[0]) throw new AppError("Claim not found",404);
 if(claims[0].submitted_by===user.userId) throw new AppError("Another staff member must review your own claim",403);
 await mysqlPool.execute("CALL sp_process_claim(?,?,?,?)",[id,user.userId,status,remarks]);
 await tryWriteAuditEvent({userId:user.userId,eventType:"CLAIM_"+status,entityType:"CLAIM",entityId:id,payload:{remarks}});
}

