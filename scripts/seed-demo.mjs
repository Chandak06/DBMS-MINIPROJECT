import { createSqlConnection,createMongoClient,mongoDatabase } from "./db-config.mjs";
import { replayOutbox } from "./sync-mongo.mjs";
const sql=await createSqlConnection(),mongo=createMongoClient();
try {
 const [[student]]=await sql.execute("SELECT user_id FROM `USER` WHERE email=? AND role='STUDENT'",[process.env.SEED_STUDENT_EMAIL]);
 const [[staff]]=await sql.execute("SELECT user_id FROM `USER` WHERE email=? AND role='STUDENT'",[process.env.SEED_FINDER_EMAIL]);
 if(!student||!staff)throw new Error("Set SEED_STUDENT_EMAIL and SEED_FINDER_EMAIL to two provisioned Student accounts");
 const samples=[
  {code:"DEMO_WALLET",name:"Black leather wallet",description:"Black leather wallet with a silver zipper and card slots",category:2,color:"Black",brand:"Fossil",location:1,tags:["wallet","black","leather"],keywords:["silver zipper"],attrs:{material:"leather",identifyingMark:"Small star stamped inside"},age:24},
  {code:"DEMO_HEADPHONES",name:"Blue wireless headphones",description:"Blue over-ear headphones in a carrying case",category:1,color:"Blue",brand:"Sony",location:2,tags:["headphones","blue","wireless"],keywords:["carrying case"],attrs:{model:"WH-CH720N"},age:48}
 ];
 await sql.beginTransaction();
 for(const s of samples)for(const kind of ["lost","found"]) {
  const table=kind==="lost"?"LOST_ITEM":"FOUND_ITEM",key=kind+"_id";
  const [[existing]]=await sql.execute("SELECT "+key+" AS id FROM "+table+" WHERE remarks=? AND reported_by=? LIMIT 1",[s.code,kind==="lost"?student.user_id:staff.user_id]);
  if(existing){console.log(kind+" report #"+existing.id+" already seeded; status preserved.");continue;}
  const date=new Date(Date.now()-(s.age-(kind==="found"?2:0))*3600000);
  const [r]=await sql.execute("INSERT INTO "+table+" (item_name,description,"+kind+"_datetime,color,brand,status,remarks,reported_by,category_id,location_id) VALUES (?,?,?,?,?,'OPEN',?,?,?,?)",[s.name,s.description,date,s.color,s.brand,s.code,kind==="lost"?student.user_id:staff.user_id,s.category,s.location]);
  await sql.execute("INSERT INTO MONGO_OUTBOX(collection_name,document_id,payload) VALUES (?,?,?)",[kind+"_item_details",r.insertId,JSON.stringify({tags:s.tags,search_keywords:s.keywords,extra_attributes:s.attrs,media:[]})]);
  console.log("Seeded "+kind+" report #"+r.insertId);
 }
 await sql.commit();await mongo.connect();console.log(await replayOutbox(sql,mongo.db(mongoDatabase)));
} catch(e){await sql.rollback();console.error(e.message);process.exitCode=1;}
finally{await sql.end();await mongo.close();}
