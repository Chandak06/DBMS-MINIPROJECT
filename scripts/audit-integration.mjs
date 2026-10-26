import { spawn } from "node:child_process";
import { mkdir,writeFile,open } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { diagnostic } from "../lib/outbox-worker.mjs";

// Separate databases and server. Existing application data is never cleaned up.
const name="clf_audit_"+Date.now();
const port=process.env.AUDIT_TEST_PORT||"3100";
const env={...process.env,MYSQL_DATABASE:name,MONGODB_URI:process.env.AUDIT_MONGODB_URI||"mongodb://127.0.0.1:27018",MONGODB_DATABASE:name,APP_BASE_URL:"http://localhost:"+port,TEST_BASE_URL:"http://localhost:"+port,DEMO_LOGIN_ENABLED:"true",DEMO_STUDENT_EMAIL:"audit-student@campus.test",DEMO_STAFF_EMAIL:"audit-staff@campus.test",DEMO_ADMIN_EMAIL:"audit-admin@campus.test",SESSION_SECRET:randomUUID()+randomUUID(),INTEGRATION_RETAIN_FIXTURES:"true",INTEGRATION_RESULTS_PATH:"docs/testing/results/audit-integration-results.json"};
const dir="artifacts/local/audit-2026-10-26";
await mkdir(dir,{recursive:true});
const log=await open(dir+"/test-server.log","a");
const run=(file,args=[])=>new Promise((resolve,reject)=>{
 const p=spawn(process.execPath,["--env-file=.env.local",file,...args],{env,stdio:"inherit",windowsHide:true});
 p.on("error",reject);p.on("exit",code=>code===0?resolve():reject(new Error(file+" exited "+code)));
});
let server;
try{
 for(let i=0;i<2;i++)await run("scripts/setup-databases.mjs");
 for(let i=0;i<2;i++){await run("scripts/seed.mjs");await run("scripts/seed-demo.mjs");}
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",port],{env,stdio:["ignore",log.fd,log.fd],windowsHide:true});
 server.on("error",e=>console.error(diagnostic(e)));
 let ready=false;
 for(let i=0;i<60;i++){
  try{const r=await fetch(env.APP_BASE_URL+"/login");if(r.status===200){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ready)throw new Error("Isolated test server did not start; inspect artifacts/local/audit-2026-10-26/test-server.log");
 await writeFile(dir+"/test-context.json",JSON.stringify({sqlDatabase:name,mongoDatabase:name,baseUrl:env.APP_BASE_URL,existingApplicationDatabasesUnchanged:true,fixturesRetained:true},null,2));
 await run("scripts/integration-test.mjs");
 await run("scripts/outbox-integration.mjs");
 console.log("Isolated audit integration completed; test databases retained as "+name);
}catch(e){console.error(diagnostic(e),e.message?.startsWith("scripts/")?e.message:"");process.exitCode=1;}
finally{if(server)server.kill();await log.close();}
