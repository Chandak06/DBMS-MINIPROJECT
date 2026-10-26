import type { PoolConnection } from "mysql2/promise";
import { transaction } from "./transaction";
import { enqueueMongo, tryFlushMongoOutbox } from "./outbox";
export type AuditEventInput = { userId:number; eventType:string; entityType?:string; entityId?:number|string; payload?:Record<string,unknown> };
export async function enqueueAuditEvent(connection:PoolConnection,input:AuditEventInput) {
 await enqueueMongo(connection,"audit_events",input.userId,{user_id:input.userId,event_type:input.eventType,entity_type:input.entityType??null,entity_id:input.entityId??null,payload:input.payload??{},occurred_at:new Date().toISOString()});
}
export async function writeAuditEvent(input:AuditEventInput) {
 await transaction(connection=>enqueueAuditEvent(connection,input));
 await tryFlushMongoOutbox();
}
// Existing callers retain this name; writes are now durable in SQL before return.
export const tryWriteAuditEvent=writeAuditEvent;
