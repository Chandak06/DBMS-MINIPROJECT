import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { mysqlPool } from "./mysql";
import { transaction } from "./transaction";
import { enqueueAuditEvent } from "./audit";
import { tryFlushMongoOutbox } from "./outbox";
import { AppError } from "./errors";
import { normalizeEmail,matchesCollegeEmail } from "./college-email.mjs";
import { verifyPassword,DUMMY_HASH } from "./password.mjs";
import type { SessionUser } from "./types";
export const loginSchema=z.object({email:z.string().trim().email().max(255).transform(normalizeEmail),password:z.string().min(1).max(128)}).strict();
export async function loginAccount(raw:unknown):Promise<SessionUser>{
 const parsed=loginSchema.safeParse(raw);if(!parsed.success)throw new AppError("Enter your college email and password");
 const {email,password}=parsed.data;
 const [rows]=await mysqlPool.execute<RowDataPacket[]>(`SELECT u.user_id,u.email,u.role,u.password_hash,u.auth_enabled,u.credential_version,u.locked_until,
  c.registration_enabled,c.institution_code,ed.domain_name,ed.local_part_format,IF(u.locked_until>UTC_TIMESTAMP(),1,0) AS locked
  FROM USER u LEFT JOIN DEPARTMENT d ON d.department_id=u.department_id LEFT JOIN CAMPUS c ON c.campus_id=d.campus_id
  LEFT JOIN COLLEGE_EMAIL_DOMAIN ed ON ed.campus_id=c.campus_id AND ed.account_type=u.role WHERE u.email=?`,[email]);
 const row=rows[0];
 if(row?.locked)throw new AppError("Too many attempts. Retry after 15 minutes.",429);
 const passwordMatches=await verifyPassword(password,row?.password_hash||DUMMY_HASH);
 const eligible=row&&row.auth_enabled&&row.registration_enabled&&matchesCollegeEmail(email,row.role,row.institution_code,row.domain_name,row.local_part_format);
 if(!passwordMatches||!eligible){
  if(row)await mysqlPool.execute("UPDATE USER SET locked_until=IF(failed_login_attempts>=4,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),locked_until),failed_login_attempts=failed_login_attempts+1 WHERE user_id=?",[row.user_id]);
  throw new AppError("Invalid college email or password, or your college/account has not been registered by an Admin.",401);
 }
 return transaction(async connection=>{
  const [[current]]=await connection.execute<RowDataPacket[]>("SELECT auth_enabled,credential_version,password_hash FROM USER WHERE user_id=? FOR UPDATE",[row.user_id]);
  if(!current.auth_enabled||current.password_hash!==row.password_hash||current.credential_version!==row.credential_version)throw new AppError("Account changed. Please sign in again.",401);
  await connection.execute("UPDATE USER SET failed_login_attempts=0,locked_until=NULL WHERE user_id=?",[row.user_id]);
  await enqueueAuditEvent(connection,{userId:row.user_id,eventType:"LOGIN_COLLEGE",entityType:"USER",entityId:row.user_id});
  return {userId:Number(row.user_id),email:row.email,role:row.role,authVersion:Number(row.credential_version)};
 });
}
export async function finishLoginAudit(){await tryFlushMongoOutbox();}
