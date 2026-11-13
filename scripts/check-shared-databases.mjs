import {createHash} from "node:crypto";
import {isIP} from "node:net";
import {pathToFileURL} from "node:url";
import {createSqlConnection,createMongoClient,sqlDatabase,mongoDatabase,sqlConnectionOptions} from "./db-config.mjs";
import {mysqlConnectionFailure} from "../lib/mysql-errors.mjs";
import {normalizeDomain,normalizeLocalFormat,validInstitutionCode} from "../lib/college-email.mjs";
import {mongoModels} from "../database/mongodb/model.mjs";

export const REQUIRED_TABLES=["CAMPUS","DEPARTMENT","USER","CATEGORY","LOCATION","LOST_ITEM","FOUND_ITEM","MATCH","CLAIM","NOTIFICATION","COLLEGE_EMAIL_DOMAIN","MONGO_OUTBOX","SCHEMA_MIGRATION"];
const links={lost_item_details:["LOST_ITEM","lost_id"],found_item_details:["FOUND_ITEM","found_id"],match_evidence:["MATCH","match_id"]};
const canonical=value=>JSON.stringify(normalize(value));
function normalize(value){if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));return value;}
export function safeHost(host){
 if(["localhost","127.0.0.1","::1","[::1]"].includes(host))return host;
 if(isIP(host)===4)return host.split(".")[0]+".x.x.x";
 if(isIP(host)===6)return "[masked IPv6 address]";
 return host?.endsWith(".mongodb.net")?"[cluster].mongodb.net":"[configured hostname]";
}
export function serverFingerprint(metadata,database){
 const strong=typeof metadata.uuid==="string"&&metadata.uuid.length>0;
 const identity=strong?[metadata.uuid,database]:[metadata.hostname,metadata.serverId,metadata.port,metadata.version,database];
 return {value:createHash("sha256").update(JSON.stringify(identity)).digest("hex"),basis:strong?"server UUID + database":"hostname/server ID/port/version + database (fallback)"};
}
// Collection UUIDs identify the actual database independently of host aliases.
// Counts alone cannot distinguish two separate copies of the same data.
export function mongoFingerprint(collections,database){
 const names=Object.keys(mongoModels).sort();
 const identity=names.map(name=>[name,collections.find(c=>c.name===name)?.info?.uuid]);
 if(identity.some(([,uuid])=>!uuid))return undefined;
 return {value:createHash("sha256").update(JSON.stringify([database,identity.map(([name,uuid])=>[name,String(uuid)])])).digest("hex"),basis:"collection UUIDs + database"};
}
export function policyProblems(campuses,domains){
 const enabled=campuses.filter(c=>c.registration_enabled),problems=[];
 if(!enabled.length)problems.push("No registered/enabled college exists.");
 for(const c of enabled){
  const prefix="Campus #"+c.campus_id+": ";
  if(!validInstitutionCode(c.institution_code))problems.push(prefix+"institution code is absent or invalid.");
  const rows=domains.filter(d=>Number(d.campus_id)===Number(c.campus_id));
  if(rows.length!==3||!REQUIRED_ROLES.every(role=>rows.some(r=>r.account_type===role)))problems.push(prefix+"requires Student, Staff and Admin domain entries.");
  if(new Set(rows.map(r=>String(r.domain_name).toLowerCase())).size!==3)problems.push(prefix+"role domains must be distinct.");
  for(const row of rows){try{if(!row.local_part_format)throw new Error();normalizeDomain(row.domain_name);normalizeLocalFormat(row.local_part_format);}catch{problems.push(prefix+"invalid domain or ID format for "+(REQUIRED_ROLES.includes(row.account_type)?row.account_type:"unknown role")+".");}}
 }
 return problems;
}
const REQUIRED_ROLES=["STUDENT","STAFF","ADMIN"];
export function indexMatches(actual,keys,options){
 if(!actual||!!actual.unique!==!!options.unique)return false;
 const text=Object.entries(keys).filter(([,v])=>v==="text");
 if(text.length){if(actual.key?._fts!=="text"||canonical(Object.keys(actual.weights||{}).sort())!==canonical(text.map(([k])=>k).sort())||text.some(([k])=>actual.weights?.[k]!==1))return false;}
 else if(JSON.stringify(actual.key)!==JSON.stringify(keys))return false;
 return canonical(actual.partialFilterExpression??null)===canonical(options.partialFilterExpression??null);
}
async function orphanCount(sql,collection,table,key){
 let count=0,batch=[];
 const inspect=async()=>{
  const valid=batch.filter(v=>Number.isSafeInteger(v)&&v>0),ids=[...new Set(valid)];
  const [rows]=ids.length?await sql.execute("SELECT `"+key+"` AS id FROM `"+table+"` WHERE `"+key+"` IN ("+ids.map(()=>"?").join(",")+")",ids):[[]];
  const found=new Set(rows.map(r=>Number(r.id)));count+=batch.filter(v=>!Number.isSafeInteger(v)||!found.has(v)).length;batch=[];
 };
 for await(const document of collection.find({},{projection:{_id:0,[key]:1}}).batchSize(500)){batch.push(document[key]);if(batch.length===500)await inspect();}
 if(batch.length)await inspect();return count;
}
export async function checkSharedDatabases(){
 const result={checkedAt:new Date().toISOString(),result:"UNHEALTHY",mysql:{connected:false,database:sqlDatabase},mongo:{connected:false,database:mongoDatabase},checks:{},warnings:[],errors:[]};
 let sql,mongo;
 try{
  await Promise.all([
   (async()=>{
    try{
     const options=sqlConnectionOptions();result.mysql.host=safeHost(options.host);result.mysql.port=options.port;
     if(options.user?.toLowerCase()==="root")result.warnings.push("MySQL uses root. Configure a dedicated project account before team access.");
     sql=await createSqlConnection();await sql.query("START TRANSACTION READ ONLY");await sql.query("SELECT 1");
     const [[m]]=await sql.query("SELECT VERSION() AS version,DATABASE() AS selectedDatabase,@@hostname AS hostname,@@server_id AS serverId,@@port AS port");
     let uuid;try{[[{uuid}]]=await sql.query("SELECT @@server_uuid AS uuid");}catch{result.warnings.push("Server UUID unavailable; fingerprint fallback is weaker and may collide on cloned servers.");}
     Object.assign(result.mysql,{connected:true,version:m.version,selectedDatabase:m.selectedDatabase,fingerprint:serverFingerprint({...m,uuid},sqlDatabase)});
     const [tables]=await sql.execute("SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE'",[sqlDatabase]);
     const present=new Set(tables.map(t=>t.name.toUpperCase()));result.mysql.baseTables=tables.length;result.mysql.missingTables=REQUIRED_TABLES.filter(t=>!present.has(t));
     result.checks.mysqlTables=result.mysql.missingTables.length===0;
     if(!result.checks.mysqlTables){result.errors.push("Missing MySQL tables: "+result.mysql.missingTables.join(", ")+". Run db:setup once on the shared database.");return;}
     const [[accounts]]=await sql.query("SELECT COUNT(*) total,SUM(role='ADMIN') admins,SUM(role='STUDENT') students,SUM(role='STAFF') staff,SUM(auth_enabled=TRUE) enabled,SUM(auth_enabled=TRUE AND password_hash IS NULL) enabledWithoutHash FROM USER");
     result.mysql.accounts=Object.fromEntries(Object.entries(accounts).map(([k,v])=>[k,Number(v||0)]));result.checks.authentication=result.mysql.accounts.enabledWithoutHash===0;
     if(!result.checks.authentication)result.errors.push("Enabled accounts without password hashes exist. Disable or provision them through the authorized account workflow.");
     const [campuses]=await sql.query("SELECT campus_id,institution_code,registration_enabled FROM CAMPUS");
     const [domains]=await sql.query("SELECT campus_id,account_type,domain_name,local_part_format FROM COLLEGE_EMAIL_DOMAIN");
     const policies=policyProblems(campuses,domains);result.mysql.collegePolicy={registered:campuses.filter(c=>c.registration_enabled).length,problems:policies};result.checks.collegePolicy=policies.length===0;result.errors.push(...policies);
     const [[outbox]]=await sql.query("SELECT COUNT(*) total,SUM(processed_at IS NOT NULL) processed,SUM(processed_at IS NULL) pending,SUM(processed_at IS NULL AND failure_kind IN ('PERMANENT','EXHAUSTED')) failed,MAX(IF(processed_at IS NULL,TIMESTAMPDIFF(SECOND,created_at,UTC_TIMESTAMP()),NULL)) oldestPendingSeconds FROM MONGO_OUTBOX");
     result.mysql.outbox=Object.fromEntries(Object.entries(outbox).map(([k,v])=>[k,v===null&&k==='oldestPendingSeconds'?null:Number(v||0)]));result.checks.outbox=result.mysql.outbox.pending===0;
     if(!result.checks.outbox)result.warnings.push("Pending Mongo writes: run npm run db:sync or keep npm run db:worker running; inspect retained failures in Admin Sync.");
     if(result.mysql.outbox.failed>0)result.errors.push("Permanent/exhausted outbox failures require Admin inspection and an explicit retry; payloads were preserved.");
     const [[migrations]]=await sql.query("SELECT COUNT(*) count,MAX(applied_at) latestAppliedAt FROM SCHEMA_MIGRATION");
     const [latest]=await sql.query("SELECT name FROM SCHEMA_MIGRATION ORDER BY applied_at DESC,name DESC LIMIT 1");result.mysql.migrations={count:Number(migrations.count),latest:latest[0]?.name??null,latestAppliedAt:migrations.latestAppliedAt};
     result.mysql.records={};for(const table of ["USER","LOST_ITEM","FOUND_ITEM","MATCH","CLAIM","NOTIFICATION"]){const [[row]]=await sql.query("SELECT COUNT(*) n FROM `"+table+"`");result.mysql.records[table]=Number(row.n);}
    }catch(error){result.errors.push(mysqlConnectionFailure(error).message);result.mysql.error=mysqlConnectionFailure(error).code;}
   })(),
   (async()=>{
    try{
     mongo=createMongoClient();const host=mongo.options.srvHost||mongo.options.hosts[0]?.host||"unknown";
     result.mongo.cluster=safeHost(host);await mongo.connect();const db=mongo.db(mongoDatabase);await db.command({ping:1});result.mongo.connected=true;
     const collections=await db.listCollections().toArray(),names=new Set(collections.map(c=>c.name));result.mongo.missingCollections=Object.keys(mongoModels).filter(n=>!names.has(n));result.checks.mongoCollections=!result.mongo.missingCollections.length;
     result.mongo.fingerprint=mongoFingerprint(collections,mongoDatabase);
     if(!result.mongo.fingerprint)result.warnings.push("MongoDB collection UUIDs are unavailable; the shared database identity cannot be compared.");
     if(!["localhost","127.0.0.1","::1"].includes(host)&&!mongo.options.credentials)result.warnings.push("Remote MongoDB has no configured authentication. Use a database-scoped account and a restricted private network.");
     if(!result.checks.mongoCollections)result.errors.push("Missing Mongo collections: "+result.mongo.missingCollections.join(", "));
     result.mongo.collections={};result.mongo.indexProblems=[];result.mongo.validatorProblems=[];
     for(const [name,model]of Object.entries(mongoModels)){
      if(!names.has(name))continue;
      result.mongo.collections[name]=await db.collection(name).countDocuments();const indexes=await db.collection(name).indexes();
      for(const [keys,options]of model.indexes)if(!indexMatches(indexes.find(i=>i.name===options.name),keys,options))result.mongo.indexProblems.push(name+" / "+options.name);
      const options=collections.find(c=>c.name===name).options||{};
      if(canonical(options.validator?.$jsonSchema)!==canonical(model.schema)||(options.validationLevel||"strict")!=="strict"||(options.validationAction||"error")!=="error")result.mongo.validatorProblems.push(name);
     }
     result.checks.mongoIndexes=result.mongo.indexProblems.length===0;result.checks.mongoValidators=result.mongo.validatorProblems.length===0;
     if(!result.checks.mongoIndexes)result.errors.push("Mongo indexes missing or inconsistent: "+result.mongo.indexProblems.join(", "));
     if(!result.checks.mongoValidators)result.errors.push("Mongo validators inconsistent: "+result.mongo.validatorProblems.join(", "));
    }catch{result.errors.push("MongoDB connection or inspection failed. Check MONGODB_URI, the MongoDB service, private network/firewall (or Atlas access list), authentication and database permissions. Credentials were suppressed.");}
   })()
  ]);
  if(sql&&result.mysql.connected&&result.checks.mysqlTables&&mongo&&result.mongo.connected&&result.checks.mongoCollections){
   try{result.orphans={};for(const [name,[table,key]]of Object.entries(links))result.orphans[name]=await orphanCount(sql,mongo.db(mongoDatabase).collection(name),table,key);result.checks.orphans=Object.values(result.orphans).every(n=>n===0);if(!result.checks.orphans)result.errors.push("SQL/Mongo orphan documents exist. Confirm the shared MySQL target and inspect pending deletes; no documents were modified.");}
   catch{result.errors.push("SQL/Mongo orphan inspection failed. Check read permissions and retry after active writes settle.");}
  }
  result.result=result.errors.length?"UNHEALTHY":result.warnings.length?"ATTENTION":"HEALTHY";
  return result;
 }finally{
  if(sql){try{await sql.rollback();}catch{}try{await sql.end();}catch{}}
  try{await mongo?.close();}catch{}
 }
}
export function teamSummary(result){
 const records=Object.fromEntries(["USER","LOST_ITEM","FOUND_ITEM","MATCH","CLAIM"].filter(k=>result.mysql.records?.[k]!==undefined).map(k=>[k,result.mysql.records[k]]));
 return {result:result.result,mysqlFingerprint:result.mysql.fingerprint,database:result.mysql.database,migrations:result.mysql.migrations,records,mongoDatabase:result.mongo.database,mongoFingerprint:result.mongo.fingerprint,mongoCollections:result.mongo.collections,pendingOutbox:result.mysql.outbox?.pending};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const result=await checkSharedDatabases();console.log(JSON.stringify(process.argv.includes("--team")?teamSummary(result):result,null,2));if(result.result==="UNHEALTHY")process.exitCode=1;}
 catch{console.error("Shared database check could not complete. Check database configuration; credentials were suppressed.");process.exitCode=1;}
}
