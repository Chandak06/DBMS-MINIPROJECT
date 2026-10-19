import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const configured = process.env.APP_BASE_URL || request.nextUrl.origin;
    if (origin && origin !== new URL(configured).origin) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
    }
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Cross-site requests are not allowed" }, { status: 403 });
    }
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
