import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";
import { canManageReferenceData } from "@/lib/permissions";
import { departmentCreateSchema } from "@/lib/validations";

export async function GET() {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT d.department_id, d.department_name, d.campus_id, c.campus_name
       FROM DEPARTMENT d
       JOIN CAMPUS c ON c.campus_id = d.campus_id
      ORDER BY c.campus_name, d.department_name`
  );
  return NextResponse.json({ departments: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (!canManageReferenceData(session.role)) return apiError("Staff or Admin role required", 403);

  const parsed = departmentCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid department data", 400, parsed.error.flatten());
  const d = parsed.data;

  const [campus] = await mysqlPool.execute<RowDataPacket[]>("SELECT campus_id FROM CAMPUS WHERE campus_id = ?", [d.campusId]);
  if (campus.length === 0) return apiError("Campus not found", 400);

  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "INSERT INTO DEPARTMENT (department_name, campus_id) VALUES (?, ?)",
    [d.departmentName, d.campusId]
  );
  await tryWriteAuditEvent({ userId: session.userId, eventType: "DEPARTMENT_CREATE", entityType: "DEPARTMENT", entityId: result.insertId });
  return NextResponse.json({ departmentId: result.insertId }, { status: 201 });
}
