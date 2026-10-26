import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createSqlConnection, createMongoClient, sqlDatabase, mongoDatabase } from "./db-config.mjs";
import { setupMongo } from "../database/mongodb/model.mjs";
import { diagnostic } from "../lib/outbox-worker.mjs";
export function splitSql(source) {
 const statements=[]; let delimiter=";",buffer="";
 for(const line of source.replace(/^\uFEFF/,"").split(/\r?\n/)) {
  if(/^\s*--/.test(line)||!line.trim()) continue;
  const directive=line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
  if(directive) { if(buffer.trim()) throw new Error("Unexpected content before DELIMITER"); delimiter=directive[1]; continue; }
  buffer+=line+"\n";
  if(buffer.trimEnd().endsWith(delimiter)) { statements.push(buffer.trimEnd().slice(0,-delimiter.length)); buffer=""; }
 }
 if(buffer.trim()) throw new Error("SQL has an unterminated statement");
 return statements;
}
async function runFile(connection,file) {
 const source=(await readFile(file,"utf8")).replaceAll("campus_lost_found",sqlDatabase);
 for(const sql of splitSql(source)) {
  if(file.endsWith("outbox-reliability.sql")) {
   const column=sql.match(/^ALTER TABLE MONGO_OUTBOX ADD COLUMN (\w+)/i);
   if(column) {const [rows]=await connection.execute("SELECT 1 FROM information_schema.columns WHERE table_schema=? AND table_name='MONGO_OUTBOX' AND column_name=?",[sqlDatabase,column[1]]);if(rows.length)continue;}
   if(/DROP CHECK/.test(sql)) {const [rows]=await connection.execute("SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=? AND table_name='MONGO_OUTBOX' AND constraint_name='chk_outbox_collection'",[sqlDatabase]);if(!rows.length)continue;}
  }
  const index=sql.match(/^CREATE INDEX (\w+) ON (\w+)/i);
  if(index) {
   const [rows]=await connection.execute("SELECT 1 FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name=?",[sqlDatabase,index[2],index[1]]);
   if(rows.length) continue;
  }
  await connection.query(sql);
 }
 return createHash("sha256").update(source).digest("hex");
}
async function main() {
 const connection=await createSqlConnection(false), mongo=createMongoClient();
 try {
  await connection.query("CREATE DATABASE IF NOT EXISTS "+sqlDatabase+" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await connection.changeUser({database:sqlDatabase});
  await connection.query("SET time_zone='+00:00'");
  const [tables]=await connection.execute("SELECT 1 FROM information_schema.tables WHERE table_schema=? AND table_name='CAMPUS'",[sqlDatabase]);
  if(!tables.length) { await runFile(connection,"database/mysql/schema.sql"); console.log("Created the ten domain tables and role triggers."); }
  // Upgrade the submitted schema's non-generated ids without dropping existing records.
  for(const [table,column] of [["CAMPUS","campus_id"],["DEPARTMENT","department_id"],["USER","user_id"],["CATEGORY","category_id"],["LOCATION","location_id"],["LOST_ITEM","lost_id"],["FOUND_ITEM","found_id"],["MATCH","match_id"],["CLAIM","claim_id"],["NOTIFICATION","notification_id"]]) {
   const [[c]]=await connection.execute("SELECT COLUMN_TYPE,EXTRA FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?",[sqlDatabase,table,column]);
   if(!c) throw new Error("Existing schema is missing "+table+"."+column);
   if(!c.EXTRA.includes("auto_increment")) {
    if(!/^int(?: unsigned)?$/.test(c.COLUMN_TYPE)) throw new Error("Unexpected primary key type on "+table);
    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    try { await connection.query("ALTER TABLE "+String.fromCharCode(96)+table+String.fromCharCode(96)+" MODIFY "+column+" "+c.COLUMN_TYPE+" NOT NULL AUTO_INCREMENT"); }
    finally { await connection.query("SET FOREIGN_KEY_CHECKS=1"); }
    console.log("Enabled generated ids for "+table);
   }
  }
  await connection.query("CREATE TABLE IF NOT EXISTS SCHEMA_MIGRATION (name VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
  for(const file of ["database/mysql/indexes_views.sql","database/mysql/advanced.sql","database/mysql/revisions.sql","database/mysql/outbox-reliability.sql"]) {
   const [applied]=await connection.execute("SELECT checksum FROM SCHEMA_MIGRATION WHERE name=?",[file]);
   if(applied.length) { console.log("Already applied: "+file); continue; }
   const checksum=await runFile(connection,file);
   await connection.execute("INSERT INTO SCHEMA_MIGRATION(name,checksum) VALUES (?,?)",[file,checksum]);
   console.log("Applied "+file);
  }
  await runFile(connection,"database/mysql/procedures.sql");
  if(process.argv.includes("--sql-only")){console.log("SQL migrations and procedures ready; MongoDB setup explicitly skipped.");return;}
  await mongo.connect(); await setupMongo(mongo.db(mongoDatabase));
  console.log("Procedures, function, MongoDB validators and indexes are ready.");
 } finally { await connection.end(); await mongo.close(); }
}
if(process.argv[1]?.endsWith("setup-databases.mjs")) main().catch(e=>{ console.error(diagnostic(e));process.exitCode=1; });




