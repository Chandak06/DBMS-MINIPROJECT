import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, SessionUser } from "./types";
import { mysqlPool } from "./mysql";
import type { RowDataPacket } from "mysql2";

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
    role: user.role
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

    if (!Number.isSafeInteger(userId) || userId <= 0 || !email) return null;
    if (!(["STUDENT", "STAFF", "ADMIN"] as string[]).includes(role)) return null;

    return { userId, email, role };
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
    "SELECT email, role FROM `USER` WHERE user_id = ?", [user.userId]
  );
  if (!rows[0] || rows[0].email !== user.email) return null;
  return { ...user, role: rows[0].role as Role };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
