import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createSqlConnection,createMongoClient,sqlDatabase,mongoDatabase } from "./db-config.mjs";
import { diagnostic } from "../lib/outbox-worker.mjs";
const sql=await createSqlConnection(),mongo=createMongoClient();
const result={verifiedAt:new Date().toISOString(),sqlDatabase,mongoDatabase,domainCounts:{},outbox:{},integrity:{},columns:[],indexes:[],mongoIndexes:{},sourceHashes:[]};
try{
 await mongo.connect();const db=mongo.db(mongoDatabase);await db.command({ping:1});
 for(const table of ["CAMPUS","DEPARTMENT","USER","CATEGORY","LOCATION","LOST_ITEM","FOUND_ITEM","MATCH","CLAIM","NOTIFICATION"]){const [[r]]=await sql.query("SELECT COUNT(*) n FROM `"+table+"`");result.domainCounts[table]=Number(r.n);}
 const [[queue]]=await sql.query("SELECT COUNT(*) total,SUM(processed_at IS NULL) pending FROM MONGO_OUTBOX");
 const [recovered]=await sql.query("SELECT outbox_id,collection_name,document_id,attempts,processed_at,failure_kind FROM MONGO_OUTBOX WHERE outbox_id=72");result.outbox={...queue,originalPendingWrite:recovered[0]||null};
 const checks={orphanLost:"SELECT COUNT(*) n FROM LOST_ITEM i LEFT JOIN USER u ON u.user_id=i.reported_by WHERE u.user_id IS NULL",orphanFound:"SELECT COUNT(*) n FROM FOUND_ITEM i LEFT JOIN USER u ON u.user_id=i.reported_by WHERE u.user_id IS NULL",orphanMatches:"SELECT COUNT(*) n FROM `MATCH` m LEFT JOIN LOST_ITEM li ON li.lost_id=m.lost_id LEFT JOIN FOUND_ITEM fi ON fi.found_id=m.found_id WHERE li.lost_id IS NULL OR fi.found_id IS NULL",orphanClaims:"SELECT COUNT(*) n FROM CLAIM cl LEFT JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id WHERE fi.found_id IS NULL",duplicateMatches:"SELECT COUNT(*) n FROM (SELECT lost_id,found_id FROM `MATCH` GROUP BY lost_id,found_id HAVING COUNT(*)>1) x",duplicateApproved:"SELECT COUNT(*) n FROM (SELECT found_id FROM CLAIM WHERE status='APPROVED' GROUP BY found_id HAVING COUNT(*)>1) x"};
 for(const [name,query]of Object.entries(checks)){const [[r]]=await sql.query(query);result.integrity[name]=Number(r.n);}
 result.columns=(await sql.execute("SELECT COLUMN_NAME name,COLUMN_TYPE type,IS_NULLABLE nullable FROM information_schema.columns WHERE table_schema=? AND table_name='MONGO_OUTBOX' ORDER BY ORDINAL_POSITION",[sqlDatabase]))[0];
 result.indexes=(await sql.execute("SELECT INDEX_NAME name,COLUMN_NAME columnName,SEQ_IN_INDEX position FROM information_schema.statistics WHERE table_schema=? AND table_name='MONGO_OUTBOX' ORDER BY INDEX_NAME,SEQ_IN_INDEX",[sqlDatabase]))[0];
 for(const collection of ["lost_item_details","found_item_details","match_evidence","audit_events"])result.mongoIndexes[collection]=await db.collection(collection).indexes();
 for(const path of ["package.json","package-lock.json","lib/permissions.ts","lib/outbox-worker.mjs","database/mysql/outbox-reliability.sql","database/mysql/procedures.sql","database/mongodb/model.mjs"])result.sourceHashes.push({path,sha256:createHash("sha256").update(await readFile(path)).digest("hex")});
 await writeFile("docs/testing/results/audit-live-storage.json",JSON.stringify(result,null,2));
 console.log(JSON.stringify({liveDatabasesConnected:true,pending:Number(queue.pending),originalWritePreserved:!!recovered[0]?.processed_at,integrity:result.integrity}));
}catch(e){console.error(diagnostic(e));process.exitCode=1;}finally{await sql.end();await mongo.close();}
