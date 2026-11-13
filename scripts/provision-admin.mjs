import {createSqlConnection} from "./db-config.mjs";
import {adminProvisioningInput,registerCollege,provisionAccount} from "../lib/provisioning.mjs";
import {promptAdminInput} from "./admin-input.mjs";
let sql;
try{
 if(process.argv.length>2)throw new Error("Use the secure prompt or environment variables, never password command-line arguments.");
 await promptAdminInput(process.env);
 const input=adminProvisioningInput(process.env);
 sql=await createSqlConnection();await sql.beginTransaction();
 const [[existing]]=await sql.execute("SELECT role,auth_enabled,password_hash FROM USER WHERE email=?",[input.email]);
 if(existing){if(existing.role!=="ADMIN"||!existing.auth_enabled||!existing.password_hash)throw new Error("Existing account cannot be promoted or reset by bootstrap.");await sql.rollback();console.log("Administrator already exists. Account and credentials were preserved.");}
 else{
  const [[campus]]=await sql.execute("SELECT institution_code,registration_enabled FROM CAMPUS WHERE campus_id=? FOR UPDATE",[input.campusId]);
  if(!campus)throw new Error("Campus does not exist; run database setup and reference seed first.");
  const registration={institutionCode:input.registration.institutionCode,studentDomain:input.registration.domains.STUDENT,staffDomain:input.registration.domains.STAFF,adminDomain:input.registration.domains.ADMIN,studentLocalFormat:input.registration.formats.STUDENT,staffLocalFormat:input.registration.formats.STAFF,adminLocalFormat:input.registration.formats.ADMIN};
  if(!campus.registration_enabled){await registerCollege(sql,input.campusId,registration);if(input.campusName)await sql.execute("UPDATE CAMPUS SET campus_name=? WHERE campus_id=?",[input.campusName,input.campusId]);}
  else{
   const [domains]=await sql.execute("SELECT account_type,domain_name,local_part_format FROM COLLEGE_EMAIL_DOMAIN WHERE campus_id=?",[input.campusId]);
   if(campus.institution_code!==registration.institutionCode||domains.length!==3||domains.some(d=>input.registration.domains[d.account_type]!==d.domain_name||input.registration.formats[d.account_type]!==d.local_part_format))throw new Error("Registered college differs. Bootstrap will not replace its policy.");
  }
  const [departments]=await sql.execute("SELECT department_id FROM DEPARTMENT WHERE campus_id=? ORDER BY department_id LIMIT 1",[input.campusId]);
  let departmentId=departments[0]?.department_id;
  if(!departmentId){const [r]=await sql.execute("INSERT INTO DEPARTMENT(department_name,campus_id) VALUES ('College Administration',?)",[input.campusId]);departmentId=r.insertId;}
  const result=await provisionAccount(sql,{...input,role:"ADMIN",departmentId},{allowAdmin:true});
  if(result.status==="created")await sql.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES ('audit_events',?,?)",[result.userId,JSON.stringify({user_id:result.userId,event_type:"ADMIN_BOOTSTRAP",entity_type:"USER",entity_id:result.userId,payload:{campus_id:input.campusId}})]);
  await sql.commit();console.log("Administrator provisioned in the configured MySQL database. Sign in with the college email and password. No credentials were printed.");
 }
}catch{await sql?.rollback();console.error("Admin provisioning refused or failed. Check the college formats, existing campus, confirmation and local database configuration. No existing credentials were overwritten.");process.exitCode=1;}
finally{await sql?.end();delete process.env.ADMIN_PASSWORD;}
