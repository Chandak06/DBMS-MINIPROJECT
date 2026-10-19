import { mkdir,writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { createSqlConnection,createMongoClient,mongoDatabase } from "./db-config.mjs";
import { splitSql } from "./setup-databases.mjs";
const sql=await createSqlConnection(),mongo=createMongoClient();
const result={executedAt:new Date().toISOString(),sql:{},mongo:{}};
try{
 await mongo.connect();const db=mongo.db(mongoDatabase);
 const [version]=await sql.query("SELECT VERSION() AS version,@@session.time_zone AS session_time_zone");
 result.sql.version=version;
 for(const table of ["CAMPUS","DEPARTMENT","USER","CATEGORY","LOCATION","LOST_ITEM","FOUND_ITEM","MATCH","CLAIM","NOTIFICATION","MONGO_OUTBOX"]){
  const [columns]=await sql.query("SHOW COLUMNS FROM "+String.fromCharCode(96)+table+String.fromCharCode(96));
  const [indexes]=await sql.query("SHOW INDEX FROM "+String.fromCharCode(96)+table+String.fromCharCode(96));
  result.sql[table]={columns,indexes};
 }
 result.sql.triggers=(await sql.query("SHOW TRIGGERS"))[0].map(t=>({name:t.Trigger,event:t.Event,table:t.Table,timing:t.Timing}));
 result.sql.summaryView=(await sql.query("SELECT user_id,full_name,total_lost_reports,open_reports,matched_reports,closed_reports,unread_notifications FROM vw_user_lost_summary"))[0];
 result.sql.recoveryView=(await sql.query("SELECT * FROM vw_recovery_dashboard"))[0];
 const queries=splitSql(await readFile("database/mysql/queries.sql","utf8")).filter(s=>/^SELECT/i.test(s.trim()));
 result.sql.queries=[];for(let i=0;i<queries.length;i++)result.sql.queries.push({id:"Q"+(i+1),query:queries[i],rows:(await sql.query(queries[i]))[0]});
 const ddlResults=[];for(const statement of splitSql(await readFile("database/mysql/ddl_demo.sql","utf8"))){const [rows]=await sql.query(statement);ddlResults.push({statement,result:rows});}
 result.sql.ddlDemo=ddlResults;
 const transactionResults=[];for(const statement of splitSql(await readFile("database/mysql/transactions.sql","utf8"))){const [rows]=await sql.query(statement);transactionResults.push({statement,result:rows});}
 result.sql.transactionDemo=transactionResults;
 for(const collection of ["lost_item_details","found_item_details","match_evidence","audit_events"]){
  const options=(await db.listCollections({name:collection}).toArray())[0].options;
  result.mongo[collection]={validator:options.validator,indexes:await db.collection(collection).indexes(),samples:await db.collection(collection).find({},{projection:{_id:0}}).limit(2).toArray()};
 }
 result.mongo.auditAggregation=await db.collection("audit_events").aggregate([{$group:{_id:"$event_type",count:{$sum:1}}},{$sort:{count:-1}}]).toArray();
 result.mongo.tagAggregation=await db.collection("match_evidence").aggregate([{$unwind:"$matched_tags"},{$group:{_id:"$matched_tags",count:{$sum:1}}},{$sort:{count:-1}}]).toArray();
 result.mongo.textSearch=await db.collection("lost_item_details").find({$text:{$search:"wallet leather"}},{projection:{_id:0}}).toArray();
 await mkdir("docs/testing/results",{recursive:true});await writeFile("docs/testing/results/database-evidence.json",JSON.stringify(result,null,2));
 console.log("Collected table structures, indexes, views, queries, DDL/transaction results and MongoDB evidence.");
}finally{await sql.end();await mongo.close();}
