import { spawnSync } from "node:child_process";
import { mkdir,writeFile,readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createSqlConnection,createMongoClient,sqlDatabase,mongoDatabase } from "./db-config.mjs";
const scratch="clf_doc_"+Date.now(),sql=await createSqlConnection(false),mongo=createMongoClient();
const sourceFiles=["database/mysql/schema.sql","database/mysql/indexes_views.sql","database/mysql/advanced.sql","database/mysql/revisions.sql","database/mysql/procedures.sql","scripts/setup-databases.mjs","scripts/seed.mjs","scripts/seed-demo.mjs","database/mongodb/model.mjs"];
const snapshot={capturedAt:new Date().toISOString(),basis:"Fresh schema produced by the submitted setup script",sourceFiles:[],tables:[],views:[],routines:[],triggers:[],mongoCollections:[]};
try{
 const env={...process.env,MYSQL_DATABASE:scratch,MONGODB_DATABASE:scratch};
 const setup=spawnSync(process.execPath,["--env-file=.env.local","scripts/setup-databases.mjs"],{env,encoding:"utf8"});
 if(setup.status!==0)throw new Error(setup.stderr||setup.stdout);
 for(const path of sourceFiles)snapshot.sourceFiles.push({path,sha256:createHash("sha256").update(await readFile(path)).digest("hex")});
 const [[version]]=await sql.query("SELECT VERSION() AS mysqlVersion");snapshot.mysqlVersion=version.mysqlVersion;
 const [tables]=await sql.execute("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",[scratch]);
 for(const {name} of tables){
  const [columns]=await sql.execute("SELECT COLUMN_NAME AS name,COLUMN_TYPE AS type,IS_NULLABLE AS nullable,COLUMN_DEFAULT AS defaultValue,EXTRA AS extra,GENERATION_EXPRESSION AS expression FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",[scratch,name]);
  const [keys]=await sql.execute("SELECT tc.CONSTRAINT_NAME AS name,tc.CONSTRAINT_TYPE AS type,k.COLUMN_NAME AS columnName,k.REFERENCED_TABLE_NAME AS referencedTable,k.REFERENCED_COLUMN_NAME AS referencedColumn,k.ORDINAL_POSITION AS position,rc.UPDATE_RULE AS updateRule,rc.DELETE_RULE AS deleteRule FROM information_schema.TABLE_CONSTRAINTS tc LEFT JOIN information_schema.KEY_COLUMN_USAGE k ON k.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA AND k.TABLE_NAME=tc.TABLE_NAME AND k.CONSTRAINT_NAME=tc.CONSTRAINT_NAME LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA=? AND tc.TABLE_NAME=? ORDER BY tc.CONSTRAINT_TYPE,tc.CONSTRAINT_NAME,k.ORDINAL_POSITION",[scratch,name]);
  const [checks]=await sql.execute("SELECT cc.CONSTRAINT_NAME AS name,cc.CHECK_CLAUSE AS expression FROM information_schema.CHECK_CONSTRAINTS cc JOIN information_schema.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_SCHEMA=cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME=cc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA=? AND tc.TABLE_NAME=? ORDER BY cc.CONSTRAINT_NAME",[scratch,name]);
  const [indexes]=await sql.execute("SELECT INDEX_NAME AS name,NON_UNIQUE AS nonUnique,COLUMN_NAME AS columnName,SEQ_IN_INDEX AS position FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX",[scratch,name]);
  const [[create]]=await sql.query("SHOW CREATE TABLE "+scratch+"."+String.fromCharCode(96)+name+String.fromCharCode(96));
  snapshot.tables.push({name,kind:["MONGO_OUTBOX","SCHEMA_MIGRATION"].includes(name.toUpperCase())?"internal":"domain",columns,keys,checks,indexes,ddl:create["Create Table"]});
 }
 snapshot.views=(await sql.execute("SELECT TABLE_NAME AS name,VIEW_DEFINITION AS definition FROM information_schema.VIEWS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME",[scratch]))[0];
 snapshot.routines=(await sql.execute("SELECT ROUTINE_NAME AS name,ROUTINE_TYPE AS type,IS_DETERMINISTIC AS isDeterministic,SQL_DATA_ACCESS AS dataAccess,ROUTINE_DEFINITION AS definition FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=? ORDER BY ROUTINE_NAME",[scratch]))[0];
 snapshot.triggers=(await sql.execute("SELECT TRIGGER_NAME AS name,EVENT_OBJECT_TABLE AS tableName,ACTION_TIMING AS timing,EVENT_MANIPULATION AS event,ACTION_STATEMENT AS definition FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? ORDER BY TRIGGER_NAME",[scratch]))[0];
 await mongo.connect();const db=mongo.db(scratch);
 for(const c of await db.listCollections().toArray())snapshot.mongoCollections.push({name:c.name,validator:c.options.validator,indexes:await db.collection(c.name).indexes()});
 await mkdir("docs/testing/results",{recursive:true});await writeFile("docs/testing/results/final-schema.json",JSON.stringify(snapshot,null,2));
 console.log("Captured actual fresh schema: "+snapshot.tables.length+" tables, "+snapshot.views.length+" views, "+snapshot.routines.length+" routines, "+snapshot.triggers.length+" triggers, "+snapshot.mongoCollections.length+" MongoDB collections.");
}finally{
 if(!/^clf_doc_\d+$/.test(scratch)||scratch===sqlDatabase||scratch===mongoDatabase)throw new Error("Unsafe scratch cleanup target");
 await sql.query("DROP DATABASE IF EXISTS "+scratch);
 await mongo.connect();await mongo.db(scratch).dropDatabase();
 await sql.end();await mongo.close();
}

