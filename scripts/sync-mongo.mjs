import { createSqlConnection,createMongoClient,mongoDatabase } from "./db-config.mjs";
export async function replayOutbox(connection,db,limit=1000) {
 const [[lock]]=await connection.query("SELECT GET_LOCK('clf_mongo_outbox',0) AS acquired");
 if(Number(lock.acquired)!==1) return {processed:0,pending:-1};
 let processed=0;
 try {
  const [rows]=await connection.query("SELECT * FROM MONGO_OUTBOX WHERE processed_at IS NULL ORDER BY outbox_id LIMIT "+Math.max(1,Math.min(10000,limit)));
  for(const row of rows) {
   try {
    const key={lost_item_details:"lost_id",found_item_details:"found_id",match_evidence:"match_id"}[row.collection_name];
    if(!key) throw new Error("Unknown collection");
    const payload=typeof row.payload==="string"?JSON.parse(row.payload):row.payload;
    if(row.operation==="DELETE") await db.collection(row.collection_name).deleteOne({[key]:row.document_id});
    else {
     const timestamp=new Date(row.created_at.replace(" ","T")+"Z");
     await db.collection(row.collection_name).updateOne({[key]:row.document_id},{$set:{...payload,[key]:row.document_id,updated_at:timestamp},$setOnInsert:{created_at:timestamp}},{upsert:true});
    }
    await connection.execute("UPDATE MONGO_OUTBOX SET processed_at=NOW(),last_error=NULL WHERE outbox_id=?",[row.outbox_id]);processed++;
   } catch(e) {
    await connection.execute("UPDATE MONGO_OUTBOX SET attempts=attempts+1,last_error=? WHERE outbox_id=?",[String(e).slice(0,500),row.outbox_id]); throw e;
   }
  }
  const [[count]]=await connection.query("SELECT COUNT(*) AS n FROM MONGO_OUTBOX WHERE processed_at IS NULL");
  return {processed,pending:Number(count.n)};
 } finally { await connection.query("SELECT RELEASE_LOCK('clf_mongo_outbox')"); }
}
async function main() {
 const connection=await createSqlConnection(),mongo=createMongoClient();
 try { await mongo.connect(); console.log(await replayOutbox(connection,mongo.db(mongoDatabase))); }
 finally { await connection.end();await mongo.close(); }
}
if(process.argv[1]?.endsWith("sync-mongo.mjs")) main().catch(e=>{console.error(e.message);process.exitCode=1;});
