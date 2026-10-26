import { createSqlConnection,createMongoClient,mongoDatabase } from "./db-config.mjs";
import { replayOutbox as replay, diagnostic } from "../lib/outbox-worker.mjs";
export const replayOutbox = (connection,db,limit=1000) => replay(connection,async()=>db,limit);
async function main() {
 const connection=await createSqlConnection(),mongo=createMongoClient();
 let ready;
 const getDb=()=>ready ??= mongo.connect().then(()=>mongo.db(mongoDatabase));
 const once=async()=>{ready=undefined; const result=await replay(connection,getDb); console.log(result); return result;};
 try {
  if(process.argv.includes("--watch")) { console.log("Synchronization worker running (5-second interval)."); while(true) {await once();await new Promise(r=>setTimeout(r,5000));} }
  else {const result=await once();if(result.pending>0)process.exitCode=2;}
 } finally {await connection.end();await mongo.close();}
}
if(process.argv[1]?.endsWith("sync-mongo.mjs")) main().catch(e=>{console.error(diagnostic(e));process.exitCode=1;});
