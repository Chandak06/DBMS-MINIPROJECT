import {describe,it,expect} from "vitest";
import {mysqlConnectionOptions} from "@/lib/mysql-config.mjs";
import {mysqlConnectionFailure} from "@/lib/mysql-errors.mjs";
// The CLI module has an import guard: importing helpers opens no connections.
import {safeHost,serverFingerprint,mongoFingerprint,policyProblems,indexMatches,teamSummary} from "../scripts/check-shared-databases.mjs";

describe("canonical remote MySQL configuration",()=>{
 it("uses the same environment fields for local and remote connections",()=>{
  const env={MYSQL_HOST:"host.private.example",MYSQL_PORT:"3307",MYSQL_USER:"campus_app",MYSQL_PASSWORD:"test-only",MYSQL_DATABASE:"campus_lost_found"};
  expect(mysqlConnectionOptions(true,env)).toMatchObject({host:env.MYSQL_HOST,port:3307,user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,database:env.MYSQL_DATABASE,timezone:"+00:00",connectTimeout:10000});
  expect(mysqlConnectionOptions(false,env)).not.toHaveProperty("database");
 });
 for(const env of [{MYSQL_PORT:"0"},{MYSQL_PORT:"70000"},{MYSQL_PORT:"abc"},{MYSQL_DATABASE:"db;SELECT 1"},{MYSQL_HOST:"mysql://user:secret@host"},{MYSQL_SSL:"insecure"}])it("rejects invalid connection configuration "+Object.keys(env),()=>expect(()=>mysqlConnectionOptions(true,env)).toThrow());
 it("keeps local TLS optional and verifies hosted certificates when enabled",()=>{
  expect(mysqlConnectionOptions(true,{})).not.toHaveProperty("ssl");
  expect(mysqlConnectionOptions(true,{MYSQL_SSL:"true"}).ssl).toEqual({rejectUnauthorized:true,verifyIdentity:true,minVersion:"TLSv1.2"});
 });
 it("does not disclose a private certificate path on read failure",()=>{
  try{mysqlConnectionOptions(true,{MYSQL_SSL_CA_FILE:"missing-private-cert-unit-test.pem"});throw new Error("Expected rejection");}catch(error){expect(String(error)).not.toContain("missing-private-cert-unit-test.pem");expect(String(error)).toContain("MYSQL_SSL_CA_FILE");}
 });
 for(const code of ["ECONNREFUSED","ETIMEDOUT","ENOTFOUND","ER_ACCESS_DENIED_ERROR","ER_BAD_DB_ERROR"])it("classifies "+code+" without driver secrets",()=>{
  const r=mysqlConnectionFailure({code,message:"private-password connection URI"});expect(r.code).toBe(code);expect(r.message).not.toContain("private-password");
 });
 it("does not echo an unknown error code or message",()=>expect(JSON.stringify(mysqlConnectionFailure({code:"secret-value",message:"password-value"}))).not.toMatch(/secret-value|password-value/));
});
describe("shareable health metadata",()=>{
 it("compares the actual Mongo collections regardless of collection order, and detects a separate copy",()=>{
  const collections=["lost_item_details","found_item_details","match_evidence","audit_events"].map((name,i)=>({name,info:{uuid:"uuid-"+i}}));
  const fingerprint=mongoFingerprint(collections,"db");
  expect(fingerprint).toEqual(mongoFingerprint([...collections].reverse(),"db"));
  expect(fingerprint).not.toEqual(mongoFingerprint(collections.map(c=>({...c,info:{uuid:c.info.uuid+"-copy"}})),"db"));
  expect(fingerprint).not.toEqual(mongoFingerprint(collections,"another_db"));
  expect(mongoFingerprint(collections.slice(1),"db")).toBeUndefined();
  expect(JSON.stringify(fingerprint)).not.toContain("uuid-0");
 });
 it("masks private endpoints",()=>{expect(safeHost("10.40.50.60")).toBe("10.x.x.x");expect(safeHost("cluster.example.mongodb.net")).toBe("[cluster].mongodb.net");expect(safeHost("private-laptop")).not.toContain("private-laptop");});
 it("lets host loopback and VPN clients compare the same server UUID/database",()=>{
  const a=serverFingerprint({uuid:"server-test-uuid",hostname:"host-a",version:"8.0"},"campus_lost_found");
  const b=serverFingerprint({uuid:"server-test-uuid",hostname:"alias-b",version:"8.4"},"campus_lost_found");
  expect(a).toEqual(b);expect(a.value).toHaveLength(64);expect(a.value).not.toContain("server-test-uuid");expect(serverFingerprint({uuid:"server-test-uuid"},"another_db").value).not.toBe(a.value);
 });
 it("identifies the weaker fallback",()=>expect(serverFingerprint({hostname:"host",serverId:1,version:"8",port:3306},"db").basis).toContain("fallback"));
 it("limits team output to comparable state, excluding hosts, account identities and diagnostics",()=>{
  const result={result:"HEALTHY",mysql:{host:"private-address",password:"secret-value",fingerprint:{value:"fingerprint",basis:"UUID"},database:"db",migrations:{count:7},records:{USER:3},outbox:{pending:0}},mongo:{database:"db",collections:{audit_events:4}},errors:["private-message"]};
  const output=JSON.stringify(teamSummary(result));expect(output).toContain("fingerprint");expect(output).not.toMatch(/private-address|secret-value|private-message/);
 });
});
describe("college and Mongo model inspection",()=>{
 const campus=[{campus_id:1,institution_code:"COL",registration_enabled:1}];
 const domains=["STUDENT","STAFF","ADMIN"].map((role,i)=>({campus_id:1,account_type:role,domain_name:["students.example.edu","staff.example.edu","admin.example.edu"][i],local_part_format:"{id}"}));
 it("accepts the existing configurable policy",()=>expect(policyProblems(campus,domains)).toEqual([]));
 it("reports missing college registration",()=>expect(policyProblems([],[]).length).toBeGreaterThan(0));
 it("reports missing roles, duplicate domains and malformed formats",()=>{
  expect(policyProblems(campus,domains.slice(1)).length).toBeGreaterThan(0);
  expect(policyProblems(campus,domains.map(d=>({...d,domain_name:"same.example.edu"}))).length).toBeGreaterThan(0);
  expect(policyProblems(campus,domains.map(d=>({...d,local_part_format:"(a+)+$"}))).length).toBeGreaterThan(0);
 });
 it("checks unique/key/partial-filter options instead of just an index name",()=>{
  expect(indexMatches({key:{lost_id:1},unique:true},{lost_id:1},{unique:true})).toBe(true);
  expect(indexMatches({key:{lost_id:1}},{lost_id:1},{unique:true})).toBe(false);
  expect(indexMatches({key:{found_id:1},unique:true},{lost_id:1},{unique:true})).toBe(false);
  expect(indexMatches({key:{event_id:1},unique:true},{event_id:1},{unique:true,partialFilterExpression:{event_id:{$type:"string"}}})).toBe(false);
 });
 it("recognizes MongoDB's internal text-index representation",()=>expect(indexMatches({key:{_fts:"text",_ftsx:1},weights:{tags:1,search_keywords:1}},{search_keywords:"text",tags:"text"},{})).toBe(true));
});
