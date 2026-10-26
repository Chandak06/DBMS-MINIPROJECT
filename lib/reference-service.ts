import { NextResponse } from "next/server";
import type { RowDataPacket,ResultSetHeader } from "mysql2";
import { withPermission } from "./api-route";
import { mysqlPool } from "./mysql";
import { transaction } from "./transaction";
import { enqueueAuditEvent } from "./audit";
import { tryFlushMongoOutbox } from "./outbox";
import { AppError } from "./errors";
import { campusCreateSchema,departmentCreateSchema,categoryCreateSchema,locationCreateSchema } from "./validations";
const config={
 campuses:{table:"CAMPUS",id:"campusId",schema:campusCreateSchema,columns:["campus_name","street","city","state","postal_code"],fields:["campusName","street","city","state","postalCode"],order:"campus_name"},
 departments:{table:"DEPARTMENT",id:"departmentId",schema:departmentCreateSchema,columns:["department_name","campus_id"],fields:["departmentName","campusId"],order:"department_name"},
 categories:{table:"CATEGORY",id:"categoryId",schema:categoryCreateSchema,columns:["category_name","description"],fields:["categoryName","description"],order:"category_name"},
 locations:{table:"LOCATION",id:"locationId",schema:locationCreateSchema,columns:["location_name","building","floor","area","type","campus_id"],fields:["locationName","building","floor","area","type","campusId"],order:"location_name"}
};
export function referenceHandlers(kind:keyof typeof config) {
 const c=config[kind];
 return {
  GET:()=>withPermission("reference.read",async()=>{
   const [rows]=await mysqlPool.query<RowDataPacket[]>(kind==="departments"?"SELECT d.*,c.campus_name FROM DEPARTMENT d JOIN CAMPUS c ON c.campus_id=d.campus_id ORDER BY c.campus_name,d.department_name":"SELECT * FROM "+c.table+" ORDER BY "+c.order);
   return NextResponse.json({[kind]:rows});
  }),
  POST:(request:Request)=>withPermission("reference.manage",async user=>{
   const parsed=c.schema.safeParse(await request.json().catch(()=>({})));
   if(!parsed.success)throw new AppError("Invalid "+kind+" data");
   const data=parsed.data as Record<string,string|number|undefined>;
   const id=await transaction(async connection=>{
    const [r]=await connection.execute<ResultSetHeader>("INSERT INTO "+c.table+" ("+c.columns.join(",")+") VALUES ("+c.columns.map(()=>"?").join(",")+")",c.fields.map(f=>data[f]??null));
    await enqueueAuditEvent(connection,{userId:user.userId,eventType:c.table+"_CREATE",entityType:c.table,entityId:r.insertId});
    return r.insertId;
   });
   await tryFlushMongoOutbox();
   return NextResponse.json({[c.id]:id},{status:201});
  })
 };
}
