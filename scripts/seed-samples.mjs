import {createSqlConnection,createMongoClient,mongoDatabase} from "./db-config.mjs";
import {matchesCollegeEmail,normalizeEmail} from "../lib/college-email.mjs";
import {replayOutbox,diagnostic} from "../lib/outbox-worker.mjs";

class SampleInputError extends Error {}
let sql,mongo;
try{
 if(!["development","test"].includes(process.env.NODE_ENV||"development"))throw new SampleInputError("Sample reports are restricted to development/test.");
 const emails=[process.env.SEED_STUDENT_EMAIL,process.env.SEED_FINDER_EMAIL].map(normalizeEmail);
 if(emails.some(e=>!e)||emails[0]===emails[1])throw new SampleInputError("Set two distinct provisioned Student emails.");
 sql=await createSqlConnection();await sql.beginTransaction();
 const students=[];
 for(const email of emails){
  const [[u]]=await sql.execute(`SELECT u.user_id,u.email,u.role,u.auth_enabled,(u.password_hash IS NOT NULL) AS has_password,c.campus_id,c.institution_code,c.registration_enabled,e.domain_name,e.local_part_format
   FROM USER u JOIN DEPARTMENT d ON d.department_id=u.department_id JOIN CAMPUS c ON c.campus_id=d.campus_id
   JOIN COLLEGE_EMAIL_DOMAIN e ON e.campus_id=c.campus_id AND e.account_type=u.role WHERE u.email=? FOR UPDATE`,[email]);
  if(!u||u.role!=="STUDENT"||!u.auth_enabled||!u.has_password||!u.registration_enabled||!matchesCollegeEmail(u.email,u.role,u.institution_code,u.domain_name,u.local_part_format))throw new SampleInputError("Samples require active provisioned Students with valid college emails.");
  students.push(u);
 }
 if(students[0].campus_id!==students[1].campus_id)throw new SampleInputError("Both Students must belong to the same registered college.");
 const [locations]=await sql.execute("SELECT location_id FROM LOCATION WHERE campus_id=? ORDER BY location_id LIMIT 2",[students[0].campus_id]);
 if(!locations.length)throw new SampleInputError("Create a location in the Students' college first.");
 const samples=[{code:"SAMPLE_WALLET",name:"Black leather wallet",category:"Wallet / Purse",description:"Black leather wallet with a silver zipper",tags:["wallet","leather"],color:"Black"},{code:"SAMPLE_HEADPHONES",name:"Blue wireless headphones",category:"Electronics",description:"Blue wireless headphones in a carrying case",tags:["headphones","wireless"],color:"Blue"}];
 let created=0;
 for(const [index,s] of samples.entries()){
  const [[category]]=await sql.execute("SELECT category_id FROM CATEGORY WHERE category_name=?",[s.category]);
  if(!category)throw new SampleInputError("Run the reference seed before adding samples.");
  for(const [i,kind] of ["lost","found"].entries()){
   const table=kind==="lost"?"LOST_ITEM":"FOUND_ITEM",key=kind+"_id",reporter=students[i].user_id;
   const [[existing]]=await sql.execute("SELECT "+key+" AS id FROM "+table+" WHERE remarks=? AND reported_by=? LIMIT 1",[s.code,reporter]);
   if(existing)continue;
   const date=new Date(Date.now()-(24-i)*3600000);
   const [r]=await sql.execute("INSERT INTO "+table+"(item_name,description,"+kind+"_datetime,color,status,remarks,reported_by,category_id,location_id) VALUES (?,?,?,?,'OPEN',?,?,?,?)",[s.name,s.description,date,s.color,s.code,reporter,category.category_id,locations[index%locations.length].location_id]);
   await sql.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES (?,?,?)",[kind+"_item_details",r.insertId,JSON.stringify({tags:s.tags,search_keywords:s.tags,extra_attributes:{sample:true},media:[]})]);
   await sql.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES ('audit_events',?,?)",[reporter,JSON.stringify({user_id:reporter,event_type:"SAMPLE_REPORT_CREATE",entity_type:table,entity_id:r.insertId,payload:{}})]);
   created++;
  }
 }
 await sql.commit();console.log("Sample reports saved: "+created+". Existing reports and credentials preserved.");
 mongo=createMongoClient();
 try{await mongo.connect();await replayOutbox(sql,async()=>mongo.db(mongoDatabase));}
 catch{console.log("Document events remain queued for the synchronization worker.");}
}catch(error){await sql?.rollback();console.error(error instanceof SampleInputError?error.message:diagnostic(error));process.exitCode=1;}
finally{await sql?.end();await mongo?.close();}
