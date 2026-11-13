import {readFile,readdir,stat} from "node:fs/promises";
import {resolve,dirname,extname} from "node:path";
import assert from "node:assert/strict";
async function files(dir){const list=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())list.push(...await files(p));else list.push(p);}return list;}
const missing=[];
for(const path of [resolve("README.md"),...(await files("docs")).filter(p=>extname(p)===".md")]){
 const source=await readFile(path,"utf8");
 for(const match of source.matchAll(/\]\(([^\s)]+)\)/g)){
  const link=match[1];if(/^(https?:|#|mailto:|codex:)/.test(link))continue;
  if(!await stat(resolve(dirname(path),link.split("#")[0])).catch(()=>null))missing.push({path,link});
 }
}
assert.deepEqual(missing,[],"Broken documentation links: "+JSON.stringify(missing));
const parsed=async name=>JSON.parse((await readFile("docs/testing/results/current/"+name,"utf8")).replace(/^\uFEFF/,""));
const unit=await parsed("unit-results.json");assert(unit.success&&unit.numPassedTests>0&&unit.numFailedTests===0);
for(const name of ["college-integration-results.json","college-schema-results.json","outbox-integration-results.json"]){const result=await parsed(name);assert(result.passed>0&&result.failed===0,name);}
const live=await parsed("college-live-storage.json");assert.equal(live.tables.filter(t=>(t.table_type||t.TABLE_TYPE)==="BASE TABLE").length,13);assert.equal(live.mongo.length,4);
const scan=await parsed("secret-scan.json");assert.equal(scan.status,"PASS");assert.deepEqual(scan.findings,[]);
const shared=await parsed("shared-database-health.json");assert(shared.mysql.connected&&shared.mongo.connected);
for(const key of ["mysqlTables","authentication","collegePolicy","outbox","mongoCollections","mongoIndexes","mongoValidators","orphans"])assert.equal(shared.checks[key],true,"Shared storage check: "+key);
assert.deepEqual(shared.errors,[]);
console.log("Verified current tests, storage inventory, read-only local database health, credential scan and documentation links. Peer-laptop connectivity still requires a separate comparison.");
