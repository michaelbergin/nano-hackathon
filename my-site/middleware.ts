import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret == null || secret === "") {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/logout") ||
    pathname.startsWith("/api/subscribe") ||
    pathname.startsWith("/account/login") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Require auth cookie for everything else (including "/")
  const token = req.cookies.get("auth")?.value;
  if (token == null || token === "") {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/:path*"],
};
