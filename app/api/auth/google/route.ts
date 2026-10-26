import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createGoogleAuthorizationUrl, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { safeDiagnostic } from "@/lib/diagnostics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const state = randomBytes(32).toString("hex");
    const response = NextResponse.redirect(createGoogleAuthorizationUrl(state));
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10
    });
    return response;
  } catch (error) {
    console.error("Google login configuration failed",safeDiagnostic(error));
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "OAUTH_CONFIG");
    return NextResponse.redirect(url);
  }
}
