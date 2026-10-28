import {mkdir,writeFile} from "node:fs/promises";
import {createSqlConnection,createMongoClient,sqlDatabase,mongoDatabase} from "./db-config.mjs";
import {diagnostic} from "../lib/outbox-worker.mjs";
let sql,mongo;
try{
 sql=await createSqlConnection();mongo=createMongoClient();await mongo.connect();
 const query=async(statement,params=[])=>{const [rows]=await sql.execute(statement,params);return rows;};
 const evidence={executedAt:new Date().toISOString(),sqlDatabase,mongoDatabase,
  tables:await query("SELECT table_name,table_type FROM information_schema.tables WHERE table_schema=? ORDER BY table_name",[sqlDatabase]),
  authenticationColumns:await query("SELECT table_name,column_name,column_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema=? AND (table_name='COLLEGE_EMAIL_DOMAIN' OR (table_name='USER' AND column_name IN ('auth_enabled','password_hash','credential_version','locked_until','failed_login_attempts')) OR (table_name='CAMPUS' AND column_name IN ('institution_code','registration_enabled'))) ORDER BY table_name,ordinal_position",[sqlDatabase]),
  colleges:await query("SELECT c.campus_id,c.campus_name,c.institution_code,c.registration_enabled,e.account_type,e.domain_name,e.local_part_format FROM CAMPUS c LEFT JOIN COLLEGE_EMAIL_DOMAIN e ON e.campus_id=c.campus_id ORDER BY c.campus_id,e.account_type"),
  accountCounts:await query("SELECT role,COUNT(*) AS accounts,SUM(auth_enabled=TRUE AND password_hash IS NOT NULL) AS provisioned_accounts FROM USER GROUP BY role"),
  workflowCounts:[],outbox:await query("SELECT collection_name,COUNT(*) AS events,SUM(processed_at IS NULL) AS pending,COALESCE(SUM(failure_kind IN ('PERMANENT','EXHAUSTED')),0) AS failed FROM MONGO_OUTBOX GROUP BY collection_name"),
  triggers:await query("SELECT trigger_name,event_manipulation,event_object_table FROM information_schema.triggers WHERE trigger_schema=? ORDER BY trigger_name",[sqlDatabase]),
  routines:await query("SELECT routine_name,routine_type FROM information_schema.routines WHERE routine_schema=? ORDER BY routine_name",[sqlDatabase]),
  migrations:await query("SELECT name,applied_at FROM SCHEMA_MIGRATION ORDER BY applied_at,name"),mongo:[]};
 for(const table of ["LOST_ITEM","FOUND_ITEM","MATCH","CLAIM"]){const [[row]]=await sql.query("SELECT COUNT(*) AS count FROM `"+table+"`");evidence.workflowCounts.push({table,count:Number(row.count)});}
 for(const name of ["lost_item_details","found_item_details","match_evidence","audit_events"]){const db=mongo.db(mongoDatabase);evidence.mongo.push({collection:name,documents:await db.collection(name).countDocuments(),indexes:(await db.collection(name).indexes()).map(i=>({name:i.name,key:i.key,unique:i.name==="_id_"||!!i.unique}))});}
 await mkdir("docs/testing/results",{recursive:true});await writeFile("docs/testing/results/college-live-storage.json",JSON.stringify(evidence,null,2));
 console.log(JSON.stringify({sql:"connected",mongo:"connected",tables:evidence.tables.filter(t=>t.TABLE_TYPE==="BASE TABLE"||t.table_type==="BASE TABLE").length,registeredColleges:new Set(evidence.colleges.filter(c=>c.registration_enabled).map(c=>c.campus_id)).size,provisionedAdmins:Number(evidence.accountCounts.find(a=>a.role==="ADMIN")?.provisioned_accounts||0),pendingOutbox:evidence.outbox.reduce((n,r)=>n+Number(r.pending),0)}));
}catch(error){console.error(diagnostic(error));process.exitCode=1;}
finally{await sql?.end();await mongo?.close();}
