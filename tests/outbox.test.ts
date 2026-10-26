import { describe,it,expect,vi } from "vitest";
import { classifyFailure,retryDelay,utcDate,diagnostic,replayOutbox } from "@/lib/outbox-worker.mjs";
import type { PoolConnection } from "mysql2/promise";
import type { Db } from "mongodb";
describe("outbox recovery policy",()=>{
 it("uses capped exponential backoff",()=>expect([1,2,3,8,20].map(retryDelay)).toEqual([5,10,20,640,3600]));
 it("retains validation failures for manual correction",()=>expect(classifyFailure({code:121},1)).toBe("PERMANENT"));
 it("bounds transient retries",()=>{expect(classifyFailure({name:"MongoNetworkError"},7)).toBe("TRANSIENT");expect(classifyFailure({name:"MongoNetworkError"},8)).toBe("EXHAUSTED");});
 it("accepts both mysql dateStrings and Date objects",()=>{const d=new Date("2026-10-26T06:00:00Z");expect(utcDate(d)).toEqual(d);expect(utcDate("2026-10-26 06:00:00")).toEqual(d);expect(utcDate("2026-10-26T11:30:00+05:30")).toEqual(d);});
 it("never exposes a connection string through diagnostics",()=>expect(diagnostic({name:"MongoNetworkError",message:"mongodb://secret:password@host",code:"ECONNREFUSED"})).toBe("MongoNetworkError: ECONNREFUSED"));
 it("records connection failures even before MongoDB is acquired",async()=>{
  const row={outbox_id:5,collection_name:"lost_item_details",document_id:8,payload:{tags:[]},operation:"UPSERT",created_at:"2026-10-26 06:00:00",attempts:0};
  let selected=false;
  const connection={query:vi.fn(async(sql:string)=>{
   if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
   if(sql.includes("SELECT o.*")){if(selected)return [[]];selected=true;return [[row]];}
   if(sql.includes("COUNT(*)"))return [[{pending:1,failed:0,retryable:1}]];
   return [[]];
  }),execute:vi.fn(async()=>[{}])};
  const error=Object.assign(new Error("sensitive driver message"),{name:"MongoServerSelectionError"});
  const r=await replayOutbox(connection as unknown as PoolConnection,async()=>{throw error;});
  expect(r.pending).toBe(1);expect(r.processed).toBe(0);
  expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining("attempts=?"),[1,"MongoServerSelectionError","TRANSIENT",5,5]);
  expect(connection.query).toHaveBeenLastCalledWith("SELECT RELEASE_LOCK('clf_mongo_outbox')");
 });
 it("acknowledges only after a successful Mongo write",async()=>{
  let selected=false;
  const connection={query:vi.fn(async(sql:string)=>sql.includes("GET_LOCK")?[[{acquired:1}]]:sql.includes("COUNT(*)")?[[{pending:0,failed:0,retryable:0}]]:sql.includes("SELECT o.*")&&!selected?(selected=true,[[{outbox_id:9,document_id:2,collection_name:"audit_events",operation:"UPSERT",payload:{user_id:2,event_type:"TEST"},created_at:new Date(),attempts:0}]]):[[]]),execute:vi.fn(async()=>[{}])};
  const updateOne=vi.fn(async()=>{expect(connection.execute).not.toHaveBeenCalled();});
  const db={collection:()=>({updateOne})};
  const r=await replayOutbox(connection as unknown as PoolConnection,async()=>db as unknown as Db);
  expect(r.processed).toBe(1);expect(updateOne).toHaveBeenCalledWith({event_id:"outbox:9"},expect.objectContaining({$set:expect.objectContaining({event_id:"outbox:9",occurred_at:expect.any(Date)})}),{upsert:true});
 });
});
