import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { tryWriteAuditEvent } from "@/lib/audit";
import { exchangeGoogleCode, fetchGoogleUser, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { mysqlPool } from "@/lib/mysql";
import type { Role } from "@/lib/types";
import { transaction } from "@/lib/transaction";
import { enqueueAuditEvent } from "@/lib/audit";
import { safeDiagnostic } from "@/lib/diagnostics";

export const runtime = "nodejs";

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  role: Role;
}

function loginError(request: NextRequest, code: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return loginError(request, "OAUTH_DENIED");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return loginError(request, "STATE_MISMATCH");
  }

  try {
    const accessToken = await exchangeGoogleCode(code);
    const googleUser = await fetchGoogleUser(accessToken);

    if (!googleUser.emailVerified) return loginError(request, "EMAIL_NOT_VERIFIED");

    // Provider-verified registration always assigns STUDENT on the server.
    await transaction(async connection=>{
      const [existing]=await connection.execute<UserRow[]>("SELECT user_id FROM `USER` WHERE email=?",[googleUser.email]);
      if(!existing.length){
        try{await connection.execute("INSERT INTO `USER`(first_name,last_name,email,role) VALUES (?,?,?,'STUDENT')",[(googleUser.firstName||googleUser.name||"Campus").slice(0,80),(googleUser.lastName||"Student").slice(0,80),googleUser.email]);}
        catch(e){if((e as {code?:string}).code==="ER_DUP_ENTRY")return;throw e;}
        const [[registered]]=await connection.execute<UserRow[]>("SELECT user_id FROM `USER` WHERE email=?",[googleUser.email]);
        await enqueueAuditEvent(connection,{userId:registered.user_id,eventType:"USER_REGISTER",entityType:"USER",entityId:registered.user_id});
      }
    });
    const [rows] = await mysqlPool.execute<UserRow[]>(
      "SELECT user_id, email, role FROM `USER` WHERE LOWER(email) = ? LIMIT 1",
      [googleUser.email]
    );

    const row = rows[0];
    if (!row) return loginError(request, "ACCOUNT_NOT_REGISTERED");

    const user = { userId: row.user_id, email: row.email, role: row.role };
    const token = await createSessionToken(user);
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8
    });
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });

    await tryWriteAuditEvent({
      userId: row.user_id,
      eventType: "LOGIN_GOOGLE",
      entityType: "USER",
      entityId: row.user_id,
      payload: { provider: "google" }
    });

    return response;
  } catch (error) {
    console.error("Google login failed",safeDiagnostic(error));
    return loginError(request, "OAUTH_FAILED");
  }
}
