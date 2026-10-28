import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { mysqlPool } from "@/lib/mysql";
import {PasswordForm} from "@/components/PasswordForm";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const session = await requireSession();
  const [users] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT user_id, first_name, middle_name, last_name, phone, email, role, department_id
       FROM \`USER\` WHERE user_id = ?`,
    [session.userId]
  );
  if (!users[0]) notFound();
  const [departmentRows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT d.department_id, d.department_name, c.campus_name
       FROM DEPARTMENT d JOIN CAMPUS c ON c.campus_id = d.campus_id
      WHERE c.campus_id=? ORDER BY c.campus_name, d.department_name`,[session.campusId??-1]
  );
  const user = {
    first_name: String(users[0].first_name),
    middle_name: users[0].middle_name ? String(users[0].middle_name) : null,
    last_name: String(users[0].last_name),
    phone: users[0].phone ? String(users[0].phone) : null,
    email: String(users[0].email),
    role: String(users[0].role),
    department_id: Number(users[0].department_id)
  };
  const departments = departmentRows.map((r) => ({
    department_id: Number(r.department_id),
    department_name: String(r.department_name),
    campus_name: String(r.campus_name)
  }));
  return <main className="container stack"><h1 className="page-title">My profile</h1><ProfileForm user={user} departments={departments} /><PasswordForm/></main>;
}
