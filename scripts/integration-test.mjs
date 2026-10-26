import assert from "node:assert/strict";
import { mkdir,writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { createSqlConnection,createMongoClient,mongoDatabase } from "./db-config.mjs";
import { replayOutbox } from "./sync-mongo.mjs";
const base=(process.env.TEST_BASE_URL||process.env.APP_BASE_URL||"http://localhost:3000").replace(/\/$/,"");
if(!["localhost","127.0.0.1","[::1]"].includes(new URL(base).hostname))throw new Error("Tests require a local server");
const runId=randomUUID(),results=[],ids={lost:[],found:[],users:[]};
const sql=await createSqlConnection(),mongo=createMongoClient();await mongo.connect();const db=mongo.db(mongoDatabase);
async function test(name,work){const start=Date.now();try{await work();results.push({name,status:"PASS",durationMs:Date.now()-start});console.log("PASS "+name);}catch(e){results.push({name,status:"FAIL",error:e.message});throw e;}}
async function req(path,user,body,method=body===undefined?"GET":"POST",origin=base){
 const response=await fetch(base+path,{method,headers:{...(user?{Cookie:"clf_session="+user.token}:{}),Origin:origin,"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,data:await response.json().catch(()=>({}))};
}
async function expect(path,user,body,status,method,origin){const r=await req(path,user,body,method,origin);assert.equal(r.status,status,JSON.stringify(r.data));return r.data;}
async function session(email){
 const [[u]]=await sql.execute("SELECT user_id,email,role FROM `USER` WHERE email=?",[email]);assert(u,"Run npm run seed first.");
 return {...u,token:await new SignJWT({userId:u.user_id,email:u.email,role:u.role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.SESSION_SECRET))};
}
let failed=false;
try{
 const student=await session(process.env.DEMO_STUDENT_EMAIL),staff=await session(process.env.DEMO_STAFF_EMAIL),admin=await session(process.env.DEMO_ADMIN_EMAIL);
 const otherEmail="test-"+runId+"@campus.test";
 const [u]=await sql.execute("INSERT INTO `USER` (first_name,last_name,email,role,department_id) VALUES ('Integration','Other',?,'STUDENT',1)",[otherEmail]);ids.users.push(u.insertId);const other=await session(otherEmail);
 const now=Date.now(),payload={itemName:"Integration wallet "+runId,description:"Black leather wallet with a silver zipper",color:"Black",brand:"Fossil",categoryId:2,locationId:1,tags:["black","leather","wallet"],searchKeywords:["silver zipper"],extraAttributes:{material:"leather"}};
 let lostId,foundId,matchId,claimId,secondMatch;
 await test("Authentication required",()=>expect("/api/lost-items",null,undefined,401));
 await test("Tampered session rejected",()=>expect("/api/lost-items",{...student,token:student.token+"invalid"},undefined,401));
 await test("Database role overrides stale admin claim",async()=>{
  const token=await new SignJWT({userId:student.user_id,email:student.email,role:"ADMIN"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  await expect("/api/admin/users",{token},undefined,403);
 });
 await test("OAuth callback rejects invalid state before provider exchange",async()=>{
  const response=await fetch(base+"/api/auth/google/callback?code=invalid&state=invalid",{redirect:"manual"});
  assert.equal(response.status,307);assert(response.headers.get("location").includes("STATE_MISMATCH"));
 });
 await test("Student cannot manage categories",()=>expect("/api/categories",student,{categoryName:"Blocked"},403));
 await test("Student cannot manage users",()=>expect("/api/admin/users",student,{},403));
 await test("Cross-origin mutation rejected",()=>expect("/api/matches/generate",staff,{},403,"POST","https://untrusted.example"));
 await test("Future date rejected",()=>expect("/api/lost-items",student,{...payload,lostDatetime:new Date(now+86400000).toISOString()},400));
 await test("Invalid foreign reference rejected",()=>expect("/api/lost-items",student,{...payload,categoryId:2147483647,lostDatetime:new Date(now-7200000).toISOString()},400));
 await test("Lost report persists in both databases",async()=>{const r=await expect("/api/lost-items",student,{...payload,lostDatetime:new Date(now-7200000).toISOString()},201);lostId=r.lostId;ids.lost.push(lostId);assert(r.enrichmentSaved);assert.equal((await db.collection("lost_item_details").findOne({lost_id:lostId})).extra_attributes.material,"leather");});
 await test("Duplicate active report rejected",()=>expect("/api/lost-items",student,{...payload,lostDatetime:new Date(now-7200000).toISOString()},409));
 await test("Other student's lost report hidden",()=>expect("/api/lost-items/"+lostId,other,undefined,404));
 await test("Student cannot set MATCHED",()=>expect("/api/lost-items/"+lostId,student,{status:"MATCHED"},400,"PATCH"));
 await test("Found report persists in both databases",async()=>{const r=await expect("/api/found-items",staff,{...payload,foundDatetime:new Date(now-3600000).toISOString()},201);foundId=r.foundId;ids.found.push(foundId);assert(r.enrichmentSaved);assert(await db.collection("found_item_details").findOne({found_id:foundId}));});
 await test("Private found attributes hidden from strangers",async()=>{const r=await expect("/api/found-items/"+foundId+"/details",other,undefined,200);assert(!("extra_attributes" in r.details));});
 await test("Student cannot generate matches",()=>expect("/api/matches/generate",student,{lostId},403));
 await test("Matching persists ranked evidence",async()=>{const r=await expect("/api/matches/generate",staff,{lostId},200);assert(r.matchIds.length);const [[m]]=await sql.execute("SELECT match_id,similarity_score FROM `MATCH` WHERE lost_id=? AND found_id=?",[lostId,foundId]);matchId=m.match_id;assert(Number(m.similarity_score)>.8);const e=await db.collection("match_evidence").findOne({match_id:matchId});assert(e.rule_scores);assert(e.matched_tags.includes("leather"));});
 await test("Match generation is idempotent",async()=>{await expect("/api/matches/generate",staff,{lostId},200);const [[r]]=await sql.execute("SELECT COUNT(*) AS n FROM `MATCH` WHERE lost_id=? AND found_id=?",[lostId,foundId]);assert.equal(Number(r.n),1);});
 await test("Changed details block stale acceptance and roll back",async()=>{await expect("/api/lost-items/"+lostId+"/details",student,{tags:["black","leather","wallet"],searchKeywords:["silver zipper"],extraAttributes:{material:"leather"}},200,"PUT");await expect("/api/matches/"+matchId,staff,{status:"ACCEPTED",remarks:"Compared ownership details"},409,"PATCH");const [[r]]=await sql.execute("SELECT status FROM LOST_ITEM WHERE lost_id=?",[lostId]);assert.equal(r.status,"OPEN");});
 await test("Regeneration refreshes revisions",()=>expect("/api/matches/generate",staff,{lostId},200));
 await test("Manual pairing creates competing candidate",async()=>{const r=await expect("/api/found-items",staff,{...payload,itemName:payload.itemName+" spare",foundDatetime:new Date(now-3000000).toISOString()},201);ids.found.push(r.foundId);const m=await expect("/api/matches",staff,{lostId,foundId:r.foundId},201);secondMatch=m.matchIds[0];assert(secondMatch);});
 await test("Student cannot review match",()=>expect("/api/matches/"+matchId,student,{status:"ACCEPTED",remarks:"My wallet"},403,"PATCH"));
 await test("Other student cannot read match",()=>expect("/api/matches/"+matchId,other,undefined,404));
 await test("Claim requires accepted match",()=>expect("/api/claims",student,{foundId,claimDescription:"It contains my student card"},403));
 await test("Concurrent match decisions produce one accepted pair",async()=>{const r=await Promise.all([req("/api/matches/"+matchId,staff,{status:"ACCEPTED",remarks:"Compared private ownership details"},"PATCH"),req("/api/matches/"+secondMatch,admin,{status:"ACCEPTED",remarks:"Compared item at campus desk"},"PATCH")]);assert.equal(r.filter(x=>x.status===200).length,1,JSON.stringify(r));assert(r.every(x=>[200,409].includes(x.status)));const [matches]=await sql.execute("SELECT match_id,found_id FROM `MATCH` WHERE lost_id=? AND status='ACCEPTED'",[lostId]);assert.equal(matches.length,1);matchId=matches[0].match_id;foundId=matches[0].found_id;});
 await test("Matched report cannot be edited",()=>expect("/api/lost-items/"+lostId,student,{itemName:"Changed"},409,"PATCH"));
 await test("Match notification is committed",async()=>{const r=await expect("/api/notifications",student,undefined,200);assert(r.notifications.some(n=>n.type==="MATCH"&&n.message.includes("Match #"+matchId)));});
 await test("Wrong owner cannot claim",()=>expect("/api/claims",other,{foundId,claimDescription:"I would like to claim this wallet"},403));
 await test("Owner can submit claim",async()=>{const r=await expect("/api/claims",student,{foundId,claimDescription:"My student card is inside and the zipper is silver",claimRemarks:"Collect at library desk"},201);claimId=r.claimId;});
 await test("Duplicate claim rejected",()=>expect("/api/claims",student,{foundId,claimDescription:"My student card is inside this wallet"},409));
 await test("Claim evidence is private",()=>expect("/api/claims/"+claimId,other,undefined,404));
 await test("Student cannot approve claim",()=>expect("/api/claims/"+claimId,student,{status:"APPROVED",remarks:"I own it"},403,"PATCH"));
 await test("Concurrent claim approval commits once and closes both reports",async()=>{const r=await Promise.all([req("/api/claims/"+claimId,staff,{status:"APPROVED",remarks:"Student card verified; collect at library desk."},"PATCH"),req("/api/claims/"+claimId,admin,{status:"APPROVED",remarks:"Ownership checked at desk"},"PATCH")]);assert.equal(r.filter(x=>x.status===200).length,1,JSON.stringify(r));assert(r.every(x=>[200,409].includes(x.status)));const [[state]]=await sql.execute("SELECT cl.status AS claim_status,fi.status AS found_status,li.status AS lost_status FROM CLAIM cl JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id JOIN `MATCH` m ON m.found_id=fi.found_id AND m.status='ACCEPTED' JOIN LOST_ITEM li ON li.lost_id=m.lost_id WHERE cl.claim_id=?",[claimId]);assert.deepEqual([state.claim_status,state.found_status,state.lost_status],["APPROVED","CLOSED","CLOSED"]);});
 await test("Terminal claim cannot be reversed",()=>expect("/api/claims/"+claimId,staff,{status:"REJECTED",remarks:"Changing decision"},409,"PATCH"));
 await test("MongoDB audit aggregation records one approval",async()=>{const events=await db.collection("audit_events").aggregate([{$match:{entity_id:claimId,event_type:"CLAIM_APPROVED"}},{$group:{_id:"$event_type",count:{$sum:1}}}]).toArray();assert.equal(events[0].count,1);});
 await test("MySQL role trigger rejects student reviewer",()=>assert.rejects(sql.execute("UPDATE `MATCH` SET reviewed_by=? WHERE match_id=?",[student.user_id,matchId]),/only.*admin.*staff/i));
 await test("MySQL CHECK rejects invalid score",()=>assert.rejects(sql.execute("UPDATE `MATCH` SET similarity_score=2 WHERE match_id=?",[matchId]),/Check constraint/));
 await test("MySQL trigger rejects future date",()=>assert.rejects(sql.execute("UPDATE FOUND_ITEM SET found_datetime=UTC_TIMESTAMP()+INTERVAL 2 DAY WHERE found_id=?",[foundId]),/Found time cannot be in the future/));
 await test("MongoDB validator rejects invalid detail",()=>assert.rejects(db.collection("found_item_details").insertOne({found_id:-1,tags:[4],created_at:new Date(),updated_at:new Date()}),/validation/));
 await test("Failed outbox write is retained and successfully replayed",async()=>{const [r]=await sql.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES ('lost_item_details',?,?)",[lostId,JSON.stringify({tags:[42]})]);await replayOutbox(sql,db);const [[row]]=await sql.execute("SELECT processed_at,attempts,failure_kind FROM MONGO_OUTBOX WHERE outbox_id=?",[r.insertId]);assert.equal(row.processed_at,null);assert.equal(Number(row.attempts),1);assert.equal(row.failure_kind,"PERMANENT");await sql.execute("UPDATE MONGO_OUTBOX SET payload=? WHERE outbox_id=?",[JSON.stringify({tags:["replayed"]}),r.insertId]);await expect("/api/system/sync",admin,{outboxId:r.insertId},200);assert.deepEqual((await db.collection("lost_item_details").findOne({lost_id:lostId})).tags,["replayed"]);});
 await test("Views and stored function return results",async()=>{assert((await sql.query("SELECT * FROM vw_recovery_dashboard"))[0].length);const [[r]]=await sql.query("SELECT fn_match_band(.9) AS band");assert.equal(r.band,"HIGH");});
 await test("All role pages render",async()=>{for(const [user,paths]of [[student,["/dashboard","/lost-items","/found-items","/matches","/claims","/profile","/notifications"]],[staff,["/staff","/reference-data","/matches/"+matchId,"/claims/"+claimId]],[admin,["/reference-data"]]])for(const path of paths){const r=await fetch(base+path,{headers:{Cookie:"clf_session="+user.token}});assert.equal(r.status,200,path);assert(!(await r.text()).includes("The page could not load"),path);}});
 await test("Invalid demo payload returns a validation response",()=>expect("/api/auth/demo",null,null,process.env.DEMO_LOGIN_ENABLED==="true"?400:404));
 await test("Local demo login is gated",()=>expect("/api/auth/demo",null,{role:"STAFF"},process.env.DEMO_LOGIN_ENABLED==="true"?200:404));
 await test("Notification ownership is enforced",async()=>{const r=await expect("/api/notifications",student,undefined,200),n=r.notifications.find(n=>n.message.includes("Claim #"+claimId));assert(n);await expect("/api/notifications/"+n.notification_id+"/read",other,{},404,"PATCH");await expect("/api/notifications/"+n.notification_id+"/read",student,{},200,"PATCH");});
 await test("Unmatched OPEN report deletes SQL and MongoDB",async()=>{const r=await expect("/api/lost-items",student,{...payload,itemName:"Delete "+runId,lostDatetime:new Date(now-10000000).toISOString()},201);ids.lost.push(r.lostId);await expect("/api/lost-items/"+r.lostId,student,{},200,"DELETE");assert.equal(await db.collection("lost_item_details").findOne({lost_id:r.lostId}),null);});
 // Exercise the actual API boundaries with all three database-backed roles.
 for(const actor of [student,staff,admin]){
  const name=actor.role;
  for(const path of ["campuses","departments","categories","locations"]){
   await test(name+" can read "+path,()=>expect("/api/"+path,actor,undefined,200));
   const bodies={campuses:{campusName:"Audit "+name+" "+runId},departments:{departmentName:"Audit "+name+" "+runId,campusId:1},categories:{categoryName:"Audit "+name+" "+runId},locations:{locationName:"Audit "+name+" "+runId,campusId:1}};
   await test(name+" master-data write permission: "+path,()=>expect("/api/"+path,actor,bodies[path],name==="ADMIN"?201:403));
  }
  for(const path of ["/api/admin/users","/api/system/sync"]){
   await test(name+" admin read permission: "+path,()=>expect(path,actor,undefined,name==="ADMIN"?200:403));
  }
  await test(name+" synchronization mutation permission",()=>expect("/api/system/sync",actor,{},name==="ADMIN"?200:403));
  await test(name+" user creation permission",()=>expect("/api/admin/users",actor,{firstName:"Audit",lastName:"Account",email:name.toLowerCase()+"-"+runId+"@campus.test",role:"STAFF",departmentId:1},name==="ADMIN"?201:403));
  await test(name+" role assignment permission",()=>expect("/api/admin/users/"+other.user_id,actor,{role:"STUDENT"},name==="ADMIN"?200:403,"PATCH"));
  await test(name+" direct match review permission",()=>expect("/api/matches/"+matchId,actor,{status:"REJECTED",remarks:"Terminal decision remains immutable"},name==="STUDENT"?403:409,"PATCH"));
  await test(name+" direct claim processing permission",()=>expect("/api/claims/"+claimId,actor,{status:"REJECTED",remarks:"Terminal decision remains immutable"},name==="STUDENT"?403:409,"PATCH"));
  await test(name+" match generation permission",()=>expect("/api/matches/generate",actor,{lostId},name==="STUDENT"?403:200));
  await test(name+" manual matching permission",()=>expect("/api/matches",actor,{lostId,foundId},name==="STUDENT"?403:409));
  await test(name+" profile role escalation rejected",()=>expect("/api/users/me",actor,{firstName:"Audit",lastName:"Test",departmentId:1,role:"ADMIN"},400,"PATCH"));
  await test(name+" notification send permission",()=>expect("/api/notifications",actor,{userId:other.user_id,title:"Audit message",message:"Operational test "+name,type:"GENERAL"},name==="STUDENT"?403:201));
  await test(name+" own profile can be updated",()=>expect("/api/users/me",actor,{firstName:"Demo",lastName:name,departmentId:1},200,"PATCH"));
  await test(name+" own notifications can be marked read",()=>expect("/api/notifications/read-all",actor,{},200,"PATCH"));
  await test(name+" report and details edit is atomic",async()=>{
   const r=await expect("/api/lost-items",actor,{...payload,itemName:"Atomic "+name+" "+runId,lostDatetime:new Date(now-7200000).toISOString()},201);ids.lost.push(r.lostId);
   const update={itemName:"Edited "+name+" "+runId,tags:["new-tag"],searchKeywords:["new-keyword"],extraAttributes:{verified:true},media:[]};
   await expect("/api/lost-items/"+r.lostId,actor,update,200,"PATCH");
   assert.deepEqual((await db.collection("lost_item_details").findOne({lost_id:r.lostId})).tags,["new-tag"]);
   await expect("/api/lost-items/"+r.lostId,actor,{itemName:"Must not save",tags:[42]},400,"PATCH");
   const [[saved]]=await sql.execute("SELECT item_name FROM LOST_ITEM WHERE lost_id=?",[r.lostId]);assert.equal(saved.item_name,update.itemName);
   await expect("/api/lost-items/"+r.lostId,actor,{status:"CLOSED"},200,"PATCH");
  });
  await test(name+" own found report details lifecycle",async()=>{
   const r=await expect("/api/found-items",actor,{...payload,itemName:"Details "+name+" "+runId,foundDatetime:new Date(now-7200000).toISOString()},201);ids.found.push(r.foundId);
   await expect("/api/found-items/"+r.foundId+"/details",actor,{tags:["changed"]},200,"PUT");
   await expect("/api/found-items/"+r.foundId+"/details",actor,{},200,"DELETE");
   assert.equal(await db.collection("found_item_details").findOne({found_id:r.foundId}),null);
   await expect("/api/found-items/"+r.foundId,actor,{},200,"DELETE");
  });
 }
 for(const path of ["/api/campuses","/api/departments","/api/categories","/api/locations","/api/admin/users","/api/system/sync","/api/claims","/api/matches","/api/found-items","/api/notifications","/api/users/me"]){
  await test("Anonymous denied GET "+path,()=>expect(path,null,undefined,401));
  await test("Anonymous denied POST "+path,()=>expect(path,null,{},path==="/api/users/me"?405:401));
 }
 await test("Admin cannot change own role",()=>expect("/api/admin/users/"+admin.user_id,admin,{role:"STUDENT"},403,"PATCH"));
 await test("Role revocation overrides an existing Staff session",async()=>{
  await expect("/api/admin/users/"+other.user_id,admin,{role:"STAFF"},200,"PATCH");
  const temp=await session(otherEmail);
  await expect("/api/matches/generate",temp,{lostId},200);
  await expect("/api/admin/users/"+other.user_id,admin,{role:"STUDENT"},200,"PATCH");
  await expect("/api/matches/generate",temp,{lostId},403);
 });
 await test("Admin and Staff dashboard responsibilities differ",async()=>{
  const html=async u=>await (await fetch(base+"/dashboard",{headers:{Cookie:"clf_session="+u.token}})).text();
  const sh=await html(staff),ah=await html(admin);
  assert(sh.includes("Staff dashboard"));assert(!sh.includes("Manage campus data"));assert(!sh.includes("Retry synchronization"));assert(!sh.includes("Recent system activity"));
  assert(ah.includes("Admin dashboard"));assert(ah.includes("Users and roles"));assert(ah.includes("Audit records"));
  const readonly=await (await fetch(base+"/reference-data",{headers:{Cookie:"clf_session="+staff.token}})).text();assert(!readonly.includes("Add campus"));assert(readonly.includes("Read-only"));
 });
 for(const actor of [student,staff])for(const path of ["/admin/users","/admin/sync","/admin/audit"]){await test(actor.role+" cannot open "+path,async()=>{const r=await fetch(base+path,{headers:{Cookie:"clf_session="+actor.token}});assert.equal(r.status,404);});}
 await test("Admin management pages render",async()=>{for(const path of ["/admin/users","/admin/sync","/admin/audit"]){const r=await fetch(base+path,{headers:{Cookie:"clf_session="+admin.token}});assert.equal(r.status,200);assert(!(await r.text()).includes("The page could not load"));}});
 await test("Concurrent duplicate report submissions save once",async()=>{
  const body={...payload,itemName:"Concurrent "+runId,lostDatetime:new Date(now-7200000).toISOString()};
  const responses=await Promise.all([req("/api/lost-items",student,body),req("/api/lost-items",student,body)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);ids.lost.push(responses.find(r=>r.status===201).data.lostId);
 });
 await test("Dashboard counters match SQL",async()=>{
  const [[summary]]=await sql.execute("SELECT * FROM vw_user_lost_summary WHERE user_id=?",[student.user_id]);
  const [[actual]]=await sql.execute("SELECT COUNT(*) AS n FROM LOST_ITEM WHERE reported_by=? AND status='OPEN'",[student.user_id]);assert.equal(Number(summary.open_reports),Number(actual.n));
  const html=await (await fetch(base+"/dashboard",{headers:{Cookie:"clf_session="+student.token}})).text();assert(html.includes('class="stat">'+actual.n+'<'));
 });
 await test("Staff cannot process own claim; Admin rejection preserves matched reports",async()=>{
  const p={...payload,itemName:"Staff ownership "+runId};
  const l=await expect("/api/lost-items",staff,{...p,lostDatetime:new Date(now-7200000).toISOString()},201);ids.lost.push(l.lostId);
  const f=await expect("/api/found-items",staff,{...p,foundDatetime:new Date(now-3600000).toISOString()},201);ids.found.push(f.foundId);
  const m=await expect("/api/matches",admin,{lostId:l.lostId,foundId:f.foundId},201);const mid=m.matchIds[0];
  await expect("/api/matches/"+mid,admin,{status:"ACCEPTED",remarks:"Matched item identifiers"},200,"PATCH");
  const c=await expect("/api/claims",staff,{foundId:f.foundId,claimDescription:"Private identifying mark on the inside"},201);
  await expect("/api/claims/"+c.claimId,staff,{status:"APPROVED",remarks:"Self approval is forbidden"},403,"PATCH");
  await expect("/api/claims/"+c.claimId,admin,{status:"REJECTED",remarks:"Ownership evidence was insufficient"},200,"PATCH");
  const [[row]]=await sql.execute("SELECT status FROM FOUND_ITEM WHERE found_id=?",[f.foundId]);assert.equal(row.status,"MATCHED");
  await expect("/api/claims",staff,{foundId:f.foundId,claimDescription:"Second attempt for the same item"},409);
 });
 await test("Admin cannot process own claim; Staff can verify the return",async()=>{
  const p={...payload,itemName:"Admin ownership "+runId};
  const l=await expect("/api/lost-items",admin,{...p,lostDatetime:new Date(now-7200000).toISOString()},201);ids.lost.push(l.lostId);
  const f=await expect("/api/found-items",staff,{...p,foundDatetime:new Date(now-3600000).toISOString()},201);ids.found.push(f.foundId);
  const m=await expect("/api/matches",staff,{lostId:l.lostId,foundId:f.foundId},201);
  await expect("/api/matches/"+m.matchIds[0],staff,{status:"ACCEPTED",remarks:"Matched physical identifiers"},200,"PATCH");
  const c=await expect("/api/claims",admin,{foundId:f.foundId,claimDescription:"Card and private identifying mark inside"},201);
  await expect("/api/claims/"+c.claimId,admin,{status:"APPROVED",remarks:"Self approval is forbidden"},403,"PATCH");
  await expect("/api/claims/"+c.claimId,staff,{status:"APPROVED",remarks:"Verified card and returned at campus desk"},200,"PATCH");
 });
 await test("Rejected match leaves both reports OPEN",async()=>{
  const p={...payload,itemName:"Reject candidate "+runId};
  const l=await expect("/api/lost-items",student,{...p,lostDatetime:new Date(now-7200000).toISOString()},201);ids.lost.push(l.lostId);
  const f=await expect("/api/found-items",staff,{...p,foundDatetime:new Date(now-3600000).toISOString()},201);ids.found.push(f.foundId);
  const m=await expect("/api/matches",staff,{lostId:l.lostId,foundId:f.foundId},201);
  await expect("/api/matches/"+m.matchIds[0],staff,{status:"REJECTED",remarks:"Physical item identifiers differ"},200,"PATCH");
  const [[lost]]=await sql.execute("SELECT status FROM LOST_ITEM WHERE lost_id=?",[l.lostId]);const [[found]]=await sql.execute("SELECT status FROM FOUND_ITEM WHERE found_id=?",[f.foundId]);assert.equal(lost.status,"OPEN");assert.equal(found.status,"OPEN");
 });
}catch(e){failed=true;console.error(e.message);}
finally{
 if(process.env.INTEGRATION_RETAIN_FIXTURES!=="true"){
 const lost=ids.lost.length?ids.lost:[0],found=ids.found.length?ids.found:[0];
 const [matches]=await sql.query("SELECT match_id FROM `MATCH` WHERE lost_id IN (?) OR found_id IN (?)",[lost,found]),matchIds=matches.map(m=>m.match_id);
 const [claims]=await sql.query("SELECT claim_id FROM CLAIM WHERE found_id IN (?)",[found]),claimIds=claims.map(c=>c.claim_id);
 for(const id of claimIds)await sql.execute("DELETE FROM NOTIFICATION WHERE message LIKE ?",["%Claim #"+id+" %"]);
 for(const id of matchIds)await sql.execute("DELETE FROM NOTIFICATION WHERE message LIKE ?",["%Match #"+id+" %"]);
 await sql.query("DELETE FROM CLAIM WHERE found_id IN (?)",[found]);
 await sql.query("DELETE FROM `MATCH` WHERE lost_id IN (?) OR found_id IN (?)",[lost,found]);
 await sql.query("DELETE FROM LOST_ITEM WHERE lost_id IN (?)",[lost]);await sql.query("DELETE FROM FOUND_ITEM WHERE found_id IN (?)",[found]);
 for(const [collection,key,list]of [["lost_item_details","lost_id",lost],["found_item_details","found_id",found],["match_evidence","match_id",matchIds.length?matchIds:[0]]]){await db.collection(collection).deleteMany({[key]:{$in:list}});await sql.query("DELETE FROM MONGO_OUTBOX WHERE collection_name=? AND document_id IN (?)",[collection,list]);}
 await db.collection("audit_events").deleteMany({$or:[{entity_type:"LOST_ITEM",entity_id:{$in:lost}},{entity_type:"FOUND_ITEM",entity_id:{$in:found}},{entity_type:"MATCH",entity_id:{$in:matchIds}},{entity_type:"CLAIM",entity_id:{$in:claimIds}},{event_type:"MATCH_GENERATE","payload.match_ids":{$in:matchIds}}]});
 for(const id of ids.users){await sql.execute("DELETE FROM NOTIFICATION WHERE user_id=?",[id]);await sql.execute("DELETE FROM `USER` WHERE user_id=?",[id]);}
 }
 await sql.end();await mongo.close();await mkdir("docs/testing/results",{recursive:true});
 await writeFile(process.env.INTEGRATION_RESULTS_PATH||"docs/testing/results/integration-results.json",JSON.stringify({runId,executedAt:new Date().toISOString(),passed:results.filter(r=>r.status==="PASS").length,failed:results.filter(r=>r.status==="FAIL").length,fixturesRetained:process.env.INTEGRATION_RETAIN_FIXTURES==="true",results},null,2));
}
if(failed)process.exitCode=1;



