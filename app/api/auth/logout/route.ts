import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) await tryWriteAuditEvent({ userId: session.userId, eventType: "LOGOUT", entityType: "USER", entityId: session.userId });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
