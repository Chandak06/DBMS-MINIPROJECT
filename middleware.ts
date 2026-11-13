import { NextRequest, NextResponse } from "next/server";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function allowedOrigin(request: NextRequest, origin: string): boolean {
  try {
    const configured = new URL(process.env.APP_BASE_URL || request.url);
    if (origin === configured.origin) return true;

    // NextURL normalizes loopback aliases to localhost. The browser's Origin
    // still uses the address-bar hostname, so use the actual Host header here.
    // Only a loopback-configured installation may use this local exception.
    const host = request.headers.get("host");
    if (!host || !loopbackHosts.has(configured.hostname)) return false;
    const actual = new URL(`${request.nextUrl.protocol}//${host}`);
    if (actual.username || actual.password || actual.pathname !== "/" || actual.search || actual.hash) return false;
    return loopbackHosts.has(actual.hostname) && origin === actual.origin;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && !allowedOrigin(request, origin)) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
    }
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Cross-site requests are not allowed" }, { status: 403 });
    }
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
