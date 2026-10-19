import { getMongoDb } from "./mongo";

export type AuditEventInput = {
  userId: number;
  eventType: string;
  entityType?: string;
  entityId?: number | string;
  payload?: Record<string, unknown>;
};

export async function writeAuditEvent(input: AuditEventInput): Promise<void> {
  const db = await getMongoDb();
  await db.collection("audit_events").insertOne({
    user_id: input.userId,
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {},
    occurred_at: new Date()
  });
}

export async function tryWriteAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await writeAuditEvent(input);
  } catch (error) {
    console.error("Audit event failed", error);
  }
}
