import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { withPermission } from "@/lib/api-route";
import { flushMongoOutbox } from "@/lib/outbox";
import { mysqlPool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongo";
import { outboxHealth } from "@/lib/outbox-worker.mjs";
import { safeDiagnostic } from "@/lib/diagnostics";
import { AppError } from "@/lib/errors";
import { enqueueAuditEvent } from "@/lib/audit";
export function GET() {
 return withPermission("sync.manage",async()=>{
  const connection=await mysqlPool.getConnection();
  try {
   const health=await outboxHealth(connection);
   const [rows]=await connection.query<RowDataPacket[]>("SELECT outbox_id,collection_name,document_id,operation,created_at,attempts,failure_kind,next_attempt_at FROM MONGO_OUTBOX WHERE processed_at IS NULL ORDER BY outbox_id LIMIT 100");
   let mongo:{available:boolean;diagnostic?:string}={available:true};
   try{await (await getMongoDb()).command({ping:1});}catch(e){mongo={available:false,diagnostic:safeDiagnostic(e)};}
   return NextResponse.json({...health,rows,mongo});
  }finally{connection.release();}
 });
}
export function POST(request:Request) {
 return withPermission("sync.manage",async user=>{
  const parsed=z.object({outboxId:z.number().int().positive().optional()}).strict().safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)throw new AppError("Invalid synchronization request");
  if(parsed.data.outboxId){
   const connection=await mysqlPool.getConnection();
   let locked=false;
   try{
    const [[lock]]=await connection.query<RowDataPacket[]>("SELECT GET_LOCK('clf_mongo_outbox',0) AS acquired");
    locked=Number(lock.acquired)===1;
    if(!locked)throw new AppError("A synchronization worker is busy. Retry shortly.",409);
    await connection.beginTransaction();
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT processed_at FROM MONGO_OUTBOX WHERE outbox_id=? FOR UPDATE",[parsed.data.outboxId]);
    if(!rows[0])throw new AppError("Outbox record not found",404);
    if(!rows[0].processed_at){
     await connection.execute("UPDATE MONGO_OUTBOX SET failure_kind=NULL,next_attempt_at=NULL WHERE outbox_id=?",[parsed.data.outboxId]);
     await enqueueAuditEvent(connection,{userId:user.userId,eventType:"SYNC_RETRY",entityType:"MONGO_OUTBOX",entityId:parsed.data.outboxId});
    }
    await connection.commit();
   }catch(e){await connection.rollback();throw e;}
   finally{if(locked)await connection.query("SELECT RELEASE_LOCK('clf_mongo_outbox')");connection.release();}
  }
  return NextResponse.json(await flushMongoOutbox(1000));
 });
}
