import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, SessionUser } from "./types";
import { mysqlPool } from "./mysql";
import type { RowDataPacket } from "mysql2";
import { matchesCollegeEmail } from "./college-email.mjs";

export const SESSION_COOKIE = "clf_session";

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    userId: user.userId,
    email: user.email,
    role: user.role,
    authVersion: user.authVersion
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const userId = Number(payload.userId);
    const email = String(payload.email ?? "");
    const role = String(payload.role ?? "") as Role;
    const authVersion=Number(payload.authVersion);

    if (!Number.isSafeInteger(userId) || userId <= 0 || !email) return null;
    if (!(["STUDENT", "STAFF", "ADMIN"] as string[]).includes(role)) return null;
    if(!Number.isSafeInteger(authVersion)||authVersion<1)return null;

    return { userId, email, role, authVersion };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await verifySessionToken(token);
  if (!user) return null;
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT u.email,u.role,u.auth_enabled,u.credential_version,c.campus_id,c.registration_enabled,c.institution_code,ed.domain_name,ed.local_part_format
     FROM USER u JOIN DEPARTMENT d ON d.department_id=u.department_id JOIN CAMPUS c ON c.campus_id=d.campus_id
     JOIN COLLEGE_EMAIL_DOMAIN ed ON ed.campus_id=c.campus_id AND ed.account_type=u.role
     WHERE u.user_id=?`, [user.userId]
  );
  if (!rows[0] || rows[0].email !== user.email) return null;
  if(!rows[0].auth_enabled||!rows[0].registration_enabled||Number(rows[0].credential_version)!==user.authVersion||!matchesCollegeEmail(rows[0].email,rows[0].role,rows[0].institution_code,rows[0].domain_name,rows[0].local_part_format))return null;
  return { ...user, role: rows[0].role as Role,campusId:Number(rows[0].campus_id) };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
