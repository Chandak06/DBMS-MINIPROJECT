import { NextResponse } from "next/server";
import { z } from "zod";
import { withPermission } from "@/lib/api-route";
import { transaction } from "@/lib/transaction";
import { positiveId,AppError } from "@/lib/errors";
import { collegeRegistrationSchema } from "@/lib/validations";
import { registerCollege } from "@/lib/provisioning.mjs";
import { enqueueAuditEvent } from "@/lib/audit";
import { tryFlushMongoOutbox } from "@/lib/outbox";
import type {RowDataPacket} from "mysql2";
import {matchesCollegeEmail} from "@/lib/college-email.mjs";
export function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 return withPermission("reference.manage",async actor=>{
  const id=positiveId((await params).id),raw=await request.json().catch(()=>({}));
  const disabled=z.object({registrationEnabled:z.literal(false)}).strict().safeParse(raw);
  const registration=collegeRegistrationSchema.safeParse(raw);
  if(!disabled.success&&!registration.success)throw new AppError("Supply a college code and three separate email domains, or disable registration.");
  if(id===actor.campusId&&(disabled.success||registration.success&&!matchesCollegeEmail(actor.email,"ADMIN",registration.data.institutionCode,registration.data.adminDomain,registration.data.adminLocalFormat)))throw new AppError("This change would remove your own Admin access. Use a different registered Admin or the trusted setup system.",409);
  await transaction(async connection=>{
   const [rows]=await connection.execute<RowDataPacket[]>("SELECT campus_id FROM CAMPUS WHERE campus_id=? FOR UPDATE",[id]);if(!rows.length)throw new AppError("Campus not found",404);
   if(disabled.success){await connection.execute("UPDATE CAMPUS SET registration_enabled=FALSE WHERE campus_id=?",[id]);await connection.execute("UPDATE USER u JOIN DEPARTMENT d ON d.department_id=u.department_id SET credential_version=credential_version+1 WHERE d.campus_id=?",[id]);}
   else if(registration.success)await registerCollege(connection,id,registration.data);
   await enqueueAuditEvent(connection,{userId:actor.userId,eventType:disabled.success?"COLLEGE_DISABLE":"COLLEGE_REGISTER",entityType:"CAMPUS",entityId:id});
  });
  await tryFlushMongoOutbox();return NextResponse.json({ok:true});
 });
}
