import type { RowDataPacket } from "mysql2";
import type { Document } from "mongodb";
import { mysqlPool } from "./mysql";
import { getMongoDb } from "./mongo";
import { documentSyncState } from "./outbox";
export async function matchEvidence(id:number) {
 let evidence:Document|null=null,mongoAvailable=true;
 try{evidence=await (await getMongoDb()).collection("match_evidence").findOne({match_id:id},{projection:{_id:0}});}catch{mongoAvailable=false;}
 const [rows]=await mysqlPool.execute<RowDataPacket[]>("SELECT payload,processed_at,failure_kind FROM MONGO_OUTBOX WHERE collection_name='match_evidence' AND document_id=? ORDER BY outbox_id DESC LIMIT 1",[id]);
 const latest=rows[0];
 // Prefer the latest durable snapshot to stale/missing Mongo evidence.
 if(latest&&(!latest.processed_at||!evidence))evidence=typeof latest.payload==="string"?JSON.parse(latest.payload):latest.payload;
 const syncState=await documentSyncState("match_evidence",id);
 return {evidence,mongoAvailable,syncState};
}
