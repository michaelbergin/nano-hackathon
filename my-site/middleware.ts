import { stackServerApp } from "@/stack/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Middleware for authentication and route protection
 * 
 * Route access levels:
 * - Public: /, /handler/*, /api/subscribe, static assets
 * - Authenticated: All other routes require Stack Auth session
 * - Status-based access (handled in page components):
 *   - /admin/* requires admin status
 *   - App routes require user, userPro, or admin status
 *   - waitlist users are redirected to / from app routes
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Public paths - allow access without authentication
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/handler") ||
    pathname.startsWith("/account/login") || // Legacy login redirect
    pathname.startsWith("/api/subscribe") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".json");

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check Stack Auth session for protected routes
  const user = await stackServerApp.getUser();

  if (!user) {
    // Redirect to Stack Auth sign-in page
    const url = req.nextUrl.clone();
    url.pathname = "/handler/sign-in";
    return NextResponse.redirect(url);
  }

  // User is authenticated - allow access
  // Status-based access control is handled in individual pages/API routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
