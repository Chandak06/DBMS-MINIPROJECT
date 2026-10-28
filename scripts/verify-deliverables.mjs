import { readFile,readdir,stat } from "node:fs/promises";
import { resolve,dirname,extname } from "node:path";
import assert from "node:assert/strict";
const root=process.cwd();
async function files(dir){const list=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())list.push(...await files(p));else list.push(p);}return list;}
const docs=await files("docs"),missing=[];
for(const path of [resolve("README.md"),...docs.filter(p=>extname(p)===".md")]){
 const text=await readFile(path,"utf8");
 for(const match of text.matchAll(/\]\(([^\s)]+)\)/g)){
  const link=match[1];if(/^(https?:|#|mailto:|codex:)/.test(link))continue;
  const target=resolve(dirname(path),link.split("#")[0]);
  if(!(await stat(target).catch(()=>null)))missing.push({file:path.slice(root.length+1),link});
 }
}
assert.equal(missing.length,0,JSON.stringify(missing));
const parsed=async p=>JSON.parse((await readFile(p,"utf8")).replace(/^\uFEFF/,""));
const unit=await parsed("docs/testing/results/unit-results.json"),integration=await parsed("docs/testing/results/integration-results.json"),schema=await parsed("docs/testing/results/schema-smoke.json"),audit=await parsed("docs/testing/results/dependency-audit.json"),db=await parsed("docs/testing/results/database-evidence.json");
assert(unit.success);assert.equal(unit.numPassedTests,28);assert.equal(integration.failed,0);assert.equal(integration.passed,46);assert.equal(schema.status,"PASS");assert(schema.repeatedSeed);assert.equal(audit.metadata.vulnerabilities.total,0);assert.equal(db.sql.queries.length,12);
assert(db.sql.queries.find(q=>q.id==="Q9").rows.some(r=>r.status==="APPROVED"),"Demo claim evidence missing");
assert(db.sql.recoveryView.some(r=>Number(r.recovered_items)>=1));
assert.equal(db.sql.queries.find(q=>q.id==="Q12").rows.length,0,"Pending Mongo writes");
const currentUnit=await parsed("docs/testing/results/audit-unit-results.json"),currentIntegration=await parsed("docs/testing/results/audit-integration-results.json"),outbox=await parsed("docs/testing/results/outbox-integration-results.json"),dependencies=await parsed("docs/testing/results/audit-dependencies.json"),live=await parsed("docs/testing/results/audit-live-storage.json");
assert(currentUnit.success);assert(currentUnit.numPassedTests>=85);assert.equal(currentIntegration.failed,0);assert(currentIntegration.passed>=152);assert.equal(outbox.failed,0);assert(outbox.passed>=13);assert.equal(dependencies.metadata.vulnerabilities.total,0);assert.equal(Number(live.outbox.pending),0);
const collegeUnit=await parsed("docs/testing/results/college-unit-results.json"),collegeIntegration=await parsed("docs/testing/results/college-integration-results.json"),collegeSchema=await parsed("docs/testing/results/college-schema-results.json"),collegeLive=await parsed("docs/testing/results/college-live-storage.json"),syllabus=await parsed("docs/testing/results/syllabus-evidence.json");
assert(collegeUnit.success);assert(collegeUnit.numPassedTests>=154);assert.equal(collegeIntegration.failed,0);assert(collegeIntegration.passed>=100);assert.equal(collegeSchema.failed,0);assert(collegeSchema.passed>=5);assert.equal(collegeLive.tables.filter(t=>(t.table_type||t.TABLE_TYPE)==="BASE TABLE").length,13);assert.equal(collegeLive.mongo.length,4);assert.equal(collegeLive.outbox.reduce((n,r)=>n+Number(r.pending),0),0);assert(syllabus.queries.some(q=>/^EXPLAIN/.test(q.query)));assert(syllabus.queries.some(q=>q.query.includes("vw_ranked_match_candidates")));
const texts=[resolve("README.md"),resolve(".env.example"),...(await files("app")),...(await files("components")),...(await files("lib")),...(await files("tests")),...(await files("scripts")),...(await files("database")),...docs.filter(p=>[".md",".json",".csv",".log"].includes(extname(p)))];
const local=await readFile(".env.local","utf8"),keys=["MYSQL_PASSWORD","SESSION_SECRET","GOOGLE_CLIENT_SECRET"];
for(const key of keys){
 const raw=local.match(new RegExp("^"+key+"=(.*)$","m"))?.[1]?.trim().replace(/^["']|["']$/g,"");
 if(!raw||raw.length<8||/^(your_|replace_)/.test(raw))continue;
 for(const path of texts)assert(!(await readFile(path,"utf8")).includes(raw),"Private credential appears in "+path.slice(root.length+1));
}
const mongoUri=local.match(/^MONGODB_URI=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g,"");
if(mongoUri){let password="";try{password=new URL(mongoUri).password;}catch{}for(const value of [password,password?decodeURIComponent(password):"",password?mongoUri:""]){if(value.length<8)continue;for(const path of texts)assert(!(await readFile(path,"utf8")).includes(value),"Private Mongo credential appears in "+path.slice(root.length+1));}}
console.log("Verified document links, historical and college-auth test evidence, SQL/Mongo inventory, syllabus plans, live queue recovery and credential exclusion.");
