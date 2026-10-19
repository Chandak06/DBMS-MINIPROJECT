import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir,writeFile } from "node:fs/promises";
import { createSqlConnection,createMongoClient,sqlDatabase,mongoDatabase } from "./db-config.mjs";
const suffix=Date.now().toString(),scratchSql="clf_verify_"+suffix,scratchMongo="clf_verify_"+suffix;
const sql=await createSqlConnection(false),mongo=createMongoClient();
let result={executedAt:new Date().toISOString(),status:"FAIL"};
try{
 await mongo.connect();
 const env={...process.env,MYSQL_DATABASE:scratchSql,MONGODB_DATABASE:scratchMongo,DEMO_STUDENT_EMAIL:"student@campus.test",DEMO_STAFF_EMAIL:"staff@campus.test",DEMO_ADMIN_EMAIL:"admin@campus.test"};
 for(let run=1;run<=2;run++){
  const child=spawnSync(process.execPath,["--env-file=.env.local","scripts/setup-databases.mjs"],{env,encoding:"utf8"});
  if(child.status!==0)throw new Error(child.stderr||child.stdout);
 }
 for(let run=1;run<=2;run++)for(const script of ["scripts/seed.mjs","scripts/seed-demo.mjs"]){
  const child=spawnSync(process.execPath,["--env-file=.env.local",script],{env,encoding:"utf8"});
  if(child.status!==0)throw new Error(child.stderr||child.stdout);
 }
 const [[lost]]=await sql.query("SELECT COUNT(*) AS n FROM "+scratchSql+".LOST_ITEM"),[[found]]=await sql.query("SELECT COUNT(*) AS n FROM "+scratchSql+".FOUND_ITEM");
 assert.equal(Number(lost.n),2);assert.equal(Number(found.n),2);
 assert.equal(await mongo.db(scratchMongo).collection("lost_item_details").countDocuments(),2);
 assert.equal(await mongo.db(scratchMongo).collection("found_item_details").countDocuments(),2);
 const [tables]=await sql.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE'",[scratchSql]);
 assert.equal(tables.length,12);
 const [routines]=await sql.execute("SELECT routine_name,routine_type FROM information_schema.routines WHERE routine_schema=?",[scratchSql]);assert.equal(routines.length,3);
 const [triggers]=await sql.execute("SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema=?",[scratchSql]);assert.equal(triggers.length,8);
 const [columns]=await sql.execute("SELECT table_name,column_name,extra FROM information_schema.columns WHERE table_schema=? AND column_key='PRI' AND table_name NOT IN ('SCHEMA_MIGRATION','MONGO_OUTBOX')",[scratchSql]);
 assert(columns.every(c=>(c.EXTRA||c.extra).includes("auto_increment")));
 const collections=await mongo.db(scratchMongo).listCollections({},{nameOnly:true}).toArray();assert.equal(collections.length,4);
 result={...result,status:"PASS",freshSetup:true,repeatedSetup:true,repeatedSeed:true,demoReports:4,sqlTables:tables.length,routines:routines.length,triggers:triggers.length,mongoCollections:collections.length};
 console.log(JSON.stringify(result,null,2));
}catch(e){result.error=e.message;console.error(e.message);process.exitCode=1;}
finally{
 // These names are generated here and never point to the configured application databases.
 if(!/^clf_verify_\d+$/.test(scratchSql)||scratchSql===sqlDatabase||scratchMongo===mongoDatabase)throw new Error("Invalid scratch cleanup target");
 await sql.query("DROP DATABASE IF EXISTS "+scratchSql);
 await mongo.db(scratchMongo).dropDatabase();
 await sql.end();await mongo.close();
 await mkdir("docs/testing/results",{recursive:true});await writeFile("docs/testing/results/schema-smoke.json",JSON.stringify(result,null,2));
}


