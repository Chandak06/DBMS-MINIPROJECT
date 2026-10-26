import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { MongoClient } from "mongodb";
import { writeFile } from "node:fs/promises";
import { SignJWT } from "jose";
import { createSqlConnection,createMongoClient,sqlDatabase,mongoDatabase } from "./db-config.mjs";
import { replayOutbox,diagnostic } from "../lib/outbox-worker.mjs";
if(!/^clf_audit_\d+$/.test(sqlDatabase)||sqlDatabase!==mongoDatabase)throw new Error("Outbox fault tests require isolated audit databases");
const sql=await createSqlConnection(),mongo=createMongoClient();await mongo.connect();const db=mongo.db(mongoDatabase);
const results=[];
async function test(name,work){try{await work();results.push({name,status:"PASS"});console.log("PASS "+name);}catch(e){results.push({name,status:"FAIL",diagnostic:diagnostic(e),message:e.message});throw e;}}
const base=process.env.TEST_BASE_URL;
async function user(role){const [[u]]=await sql.execute("SELECT user_id,email,role FROM USER WHERE email=?",[process.env["DEMO_"+role+"_EMAIL"]]);return {...u,token:await new SignJWT({userId:u.user_id,email:u.email,role:u.role}).setProtectedHeader({alg:"HS256"}).setExpirationTime("1h").sign(new TextEncoder().encode(process.env.SESSION_SECRET))};}
async function api(path,u,body,method="POST"){const r=await fetch(base+path,{method,headers:{Cookie:"clf_session="+u.token,Origin:base,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();return {status:r.status,data:d};}
async function insert(collection,id,payload,operation="UPSERT") {const [r]=await sql.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload,operation) VALUES (?,?,?,?)",[collection,id,JSON.stringify(payload),operation]);return r.insertId;}
const student=await user("STUDENT"),staff=await user("STAFF"),admin=await user("ADMIN");
const [[fixture]]=await sql.query("SELECT lost_id FROM LOST_ITEM ORDER BY lost_id LIMIT 1");const id=fixture.lost_id;
let deferredId;
try{
 await test("A real unavailable MongoDB connection retains payload and records failure",async()=>{
  deferredId=await insert("lost_item_details",id,{tags:["restart-test"]});
  const unavailable=new MongoClient("mongodb://127.0.0.1:1",{serverSelectionTimeoutMS:100,connectTimeoutMS:100});
  try{const r=await replayOutbox(sql,async()=>{await unavailable.connect();return unavailable.db(mongoDatabase);});assert.equal(r.processed,0);assert(r.pending>0);}finally{await unavailable.close();}
  const [[row]]=await sql.execute("SELECT processed_at,attempts,failure_kind,last_error,payload FROM MONGO_OUTBOX WHERE outbox_id=?",[deferredId]);assert.equal(row.processed_at,null);assert.equal(row.attempts,1);assert.equal(row.failure_kind,"TRANSIENT");assert(!row.last_error.includes("mongodb://"));assert(row.payload);
 });
 await test("Backoff prevents immediate automatic retry",async()=>{const r=await replayOutbox(sql,async()=>db);assert.equal(r.processed,0);});
 await test("Recovery works in a new worker process after restart",async()=>{
  // Make this test write due, retaining its attempts and payload.
  await sql.execute("UPDATE MONGO_OUTBOX SET next_attempt_at=UTC_TIMESTAMP() WHERE outbox_id=?",[deferredId]);
  await new Promise((resolve,reject)=>{const p=spawn(process.execPath,["--env-file=.env.local","scripts/sync-mongo.mjs"],{env:process.env,stdio:"pipe",windowsHide:true});p.on("error",reject);p.on("exit",code=>code===0?resolve():reject(new Error("Restarted worker exited "+code)));});
  const [[row]]=await sql.execute("SELECT processed_at,attempts FROM MONGO_OUTBOX WHERE outbox_id=?",[deferredId]);assert(row.processed_at);assert.equal(row.attempts,1);assert.deepEqual((await db.collection("lost_item_details").findOne({lost_id:id})).tags,["restart-test"]);
 });
 await test("Replaying an acknowledged write does not duplicate documents",async()=>{await replayOutbox(sql,async()=>db);assert.equal(await db.collection("lost_item_details").countDocuments({lost_id:id}),1);});
 await test("Crash after Mongo write before SQL acknowledgement replays idempotently",async()=>{
  const event=await insert("lost_item_details",id,{tags:["ack-recovery"]});
  const fault={query:sql.query.bind(sql),execute:async(statement,values)=>{if(statement.includes("SET processed_at"))throw Object.assign(new Error("Simulated SQL acknowledgement failure"),{code:"ECONNRESET"});return sql.execute(statement,values);}};
  await replayOutbox(fault,async()=>db);const [[row]]=await sql.execute("SELECT processed_at FROM MONGO_OUTBOX WHERE outbox_id=?",[event]);assert.equal(row.processed_at,null);
  await sql.execute("UPDATE MONGO_OUTBOX SET next_attempt_at=UTC_TIMESTAMP() WHERE outbox_id=?",[event]);await replayOutbox(sql,async()=>db);assert.equal(await db.collection("lost_item_details").countDocuments({lost_id:id}),1);
 });
 let failed;
 await test("Permanent validation failure does not block unrelated writes",async()=>{
  failed=await insert("lost_item_details",id,{tags:[42]});const unrelated=await insert("found_item_details",1,{tags:["healthy"]});
  await replayOutbox(sql,async()=>db);const [[bad]]=await sql.execute("SELECT processed_at,failure_kind FROM MONGO_OUTBOX WHERE outbox_id=?",[failed]);const [[good]]=await sql.execute("SELECT processed_at FROM MONGO_OUTBOX WHERE outbox_id=?",[unrelated]);assert.equal(bad.processed_at,null);assert.equal(bad.failure_kind,"PERMANENT");assert(good.processed_at);
 });
 await test("An unrelated failed write does not block matching or enrichment status",async()=>{
  const p={itemName:"Queue isolation wallet "+Date.now(),description:"Black leather wallet",color:"Black",brand:"Fossil",categoryId:2,locationId:1,tags:["wallet"],extraAttributes:{mark:"private"}};
  const l=await api("/api/lost-items",student,{...p,lostDatetime:new Date(Date.now()-7200000).toISOString()});assert.equal(l.status,201);assert.equal(l.data.enrichmentSaved,true);
  const f=await api("/api/found-items",staff,{...p,foundDatetime:new Date(Date.now()-3600000).toISOString()});assert.equal(f.status,201);assert.equal(f.data.enrichmentSaved,true);
  const r=await api("/api/matches/generate",staff,{lostId:l.data.lostId});assert.equal(r.status,200,JSON.stringify(r.data));assert(r.data.matchIds.length);
 });
 await test("Same-document writes stay blocked behind a failed predecessor",async()=>{
  const later=await insert("lost_item_details",id,{tags:["later"]});await replayOutbox(sql,async()=>db);const [[row]]=await sql.execute("SELECT processed_at FROM MONGO_OUTBOX WHERE outbox_id=?",[later]);assert.equal(row.processed_at,null);
  await sql.execute("UPDATE MONGO_OUTBOX SET payload=? WHERE outbox_id=?",[JSON.stringify({tags:["fixed"]}),failed]);const r=await api("/api/system/sync",admin,{outboxId:failed});assert.equal(r.status,200);assert.deepEqual((await db.collection("lost_item_details").findOne({lost_id:id})).tags,["later"]);
 });
 await test("Simultaneous workers cannot process a write unsafely",async()=>{
  await insert("lost_item_details",id,{tags:["concurrent"]});const other=await createSqlConnection();let release,entered;
  const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;});
  const first=replayOutbox(sql,async()=>{entered();await gate;return db;});await started;
  const second=await replayOutbox(other,async()=>db);assert.equal(second.busy,true);release();await first;await other.end();assert.equal(await db.collection("lost_item_details").countDocuments({lost_id:id}),1);
 });
 await test("Audit events survive outage and retries without duplicates",async()=>{
  const event=await insert("audit_events",admin.user_id,{user_id:admin.user_id,event_type:"AUDIT_RETRY_TEST",entity_type:"USER",entity_id:admin.user_id,payload:{}});
  await replayOutbox(sql,async()=>{throw Object.assign(new Error("offline"),{name:"MongoNetworkError"});});
  await sql.execute("UPDATE MONGO_OUTBOX SET next_attempt_at=UTC_TIMESTAMP() WHERE outbox_id=?",[event]);await replayOutbox(sql,async()=>db);await replayOutbox(sql,async()=>db);
  assert.equal(await db.collection("audit_events").countDocuments({event_id:"outbox:"+event}),1);
 });
 await test("Retry limit stops automatic attempts and Admin can request recovery",async()=>{
  const event=await insert("lost_item_details",id,{tags:["exhausted-recovery"]});await sql.execute("UPDATE MONGO_OUTBOX SET attempts=7 WHERE outbox_id=?",[event]);await replayOutbox(sql,async()=>{throw Object.assign(new Error("offline"),{name:"MongoNetworkError"});});
  const [[bad]]=await sql.execute("SELECT attempts,failure_kind,processed_at FROM MONGO_OUTBOX WHERE outbox_id=?",[event]);assert.equal(bad.attempts,8);assert.equal(bad.failure_kind,"EXHAUSTED");assert.equal(bad.processed_at,null);
  assert.equal((await replayOutbox(sql,async()=>db)).processed,0);await api("/api/system/sync",admin,{outboxId:event});const [[fixed]]=await sql.execute("SELECT processed_at,attempts FROM MONGO_OUTBOX WHERE outbox_id=?",[event]);assert(fixed.processed_at);assert.equal(fixed.attempts,8);
 });
 await test("All retained outbox records are synchronized",async()=>{await replayOutbox(sql,async()=>db);const [[r]]=await sql.query("SELECT COUNT(*) n FROM MONGO_OUTBOX WHERE processed_at IS NULL");assert.equal(Number(r.n),0);});
 await test("Matching and evidence remain available during a real Mongo connection outage",async()=>{
  const outagePort="3101",outageBase="http://localhost:"+outagePort;
  const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",outagePort],{env:{...process.env,MONGODB_URI:"mongodb://127.0.0.1:1",APP_BASE_URL:outageBase},stdio:"ignore",windowsHide:true});
  try{
   let ready=false;for(let i=0;i<40;i++){try{if((await fetch(outageBase+"/login")).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready,"Outage test server did not start");
   const p={itemName:"Outage wallet "+Date.now(),description:"Black leather wallet",color:"Black",brand:"Fossil",categoryId:2,locationId:1,tags:["wallet","leather"]};
   const l=await api("/api/lost-items",student,{...p,lostDatetime:new Date(Date.now()-7200000).toISOString()});const f=await api("/api/found-items",staff,{...p,foundDatetime:new Date(Date.now()-3600000).toISOString()});assert.equal(l.status,201);assert.equal(f.status,201);
   const request=async(path,body)=>{const r=await fetch(outageBase+path,{method:body?"POST":"GET",headers:{Cookie:"clf_session="+staff.token,Origin:outageBase,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
   const result=await request("/api/matches/generate",{lostId:l.data.lostId});assert.equal(result.status,200,JSON.stringify(result.data));assert(result.data.matchIds.length);assert.equal(result.data.evidenceSaved,false);
   const detail=await request("/api/matches/"+result.data.matchIds[0]);assert.equal(detail.status,200);assert.equal(detail.data.mongoAvailable,false);assert(detail.data.evidence.rule_scores);assert.equal(detail.data.syncState,"PENDING");
   const [pending]=await sql.query("SELECT outbox_id FROM MONGO_OUTBOX WHERE processed_at IS NULL");for(const row of pending)await api("/api/system/sync",admin,{outboxId:row.outbox_id});
   const [[remaining]]=await sql.query("SELECT COUNT(*) n FROM MONGO_OUTBOX WHERE processed_at IS NULL");assert.equal(Number(remaining.n),0);
  }finally{child.kill();}
 });
}catch(e){console.error(e.message);process.exitCode=1;}
finally{await sql.end();await mongo.close();await writeFile("docs/testing/results/outbox-integration-results.json",JSON.stringify({executedAt:new Date().toISOString(),sqlDatabase,mongoDatabase,passed:results.filter(x=>x.status==="PASS").length,failed:results.filter(x=>x.status==="FAIL").length,fixturesRetained:true,results},null,2));}
