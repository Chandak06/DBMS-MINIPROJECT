import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";
import { apiError } from "@/lib/http";
import { mysqlPool } from "@/lib/mysql";
import { profileUpdateSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT u.user_id, u.first_name, u.middle_name, u.last_name, u.phone,
            u.email, u.role, u.created_at, u.department_id,
            d.department_name, c.campus_id, c.campus_name
       FROM \`USER\` u
       LEFT JOIN DEPARTMENT d ON d.department_id = u.department_id
       LEFT JOIN CAMPUS c ON c.campus_id = d.campus_id
      WHERE u.user_id = ?`,
    [session.userId]
  );

  if (!rows[0]) return apiError("User not found", 404);
  return NextResponse.json({ user: rows[0] });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid profile data", 400, parsed.error.flatten());

  const data = parsed.data;
  const [departments] = await mysqlPool.execute<RowDataPacket[]>(
    "SELECT department_id FROM DEPARTMENT WHERE department_id = ?",
    [data.departmentId]
  );
  if (departments.length === 0) return apiError("Department not found", 400);

  await mysqlPool.execute<ResultSetHeader>(
    `UPDATE \`USER\`
        SET first_name = ?, middle_name = ?, last_name = ?, phone = ?, department_id = ?
      WHERE user_id = ?`,
    [data.firstName, data.middleName ?? null, data.lastName, data.phone ?? null, data.departmentId, session.userId]
  );

  await tryWriteAuditEvent({ userId: session.userId, eventType: "PROFILE_UPDATE", entityType: "USER", entityId: session.userId });
  return NextResponse.json({ ok: true });
}
