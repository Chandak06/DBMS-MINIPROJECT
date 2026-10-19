import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";
import { canManageReferenceData } from "@/lib/permissions";
import { campusCreateSchema } from "@/lib/validations";
import { tryWriteAuditEvent } from "@/lib/audit";

export async function GET() {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    "SELECT campus_id, campus_name, street, city, state, postal_code FROM CAMPUS ORDER BY campus_name"
  );
  return NextResponse.json({ campuses: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (!canManageReferenceData(session.role)) return apiError("Staff or Admin role required", 403);

  const parsed = campusCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid campus data", 400, parsed.error.flatten());

  const d = parsed.data;
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "INSERT INTO CAMPUS (campus_name, street, city, state, postal_code) VALUES (?, ?, ?, ?, ?)",
    [d.campusName, d.street ?? null, d.city ?? null, d.state ?? null, d.postalCode ?? null]
  );
  await tryWriteAuditEvent({ userId: session.userId, eventType: "CAMPUS_CREATE", entityType: "CAMPUS", entityId: result.insertId });
  return NextResponse.json({ campusId: result.insertId }, { status: 201 });
}
