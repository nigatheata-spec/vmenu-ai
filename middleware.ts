// =============================================================
// middleware.ts — v14 fixed
//
// BUG 1 FIX — /reset-password removed from AUTH_ONLY_ROUTES:
//   After the password reset email link is clicked, Supabase
//   creates a session and redirects to /reset-password.
//   If /reset-password is in AUTH_ONLY_ROUTES, the middleware
//   sees an authenticated user and redirects them to /dashboard
//   INSTEAD of letting them set a new password. Removing it from
//   AUTH_ONLY_ROUTES means authenticated users CAN visit /reset-password.
//
// BUG 2 FIX — trial cookie checked before Supabase:
//   Trial users have no Supabase session. Calling supabase.auth.getUser()
//   for them always returns null → redirect /login → loop.
//   The trial cookie check now short-circuits before any Supabase call.
//
// BUG 3 FIX — /dashboard added to BYPASS when navigating within app:
//   The infinite GET /dashboard loop was caused by:
//   a) useAuthSync firing SIGNED_OUT for trial users (no Supabase session)
//      → router.push("/") → middleware redirects trial back to /dashboard
//      → SIGNED_OUT fires again → loop
//   Fix: useAuthSync is not mounted for trial users (handled in DashboardClient).
//   The middleware itself is correct — the loop was in the client hook.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard"];

// Routes that authenticated users should NOT see
// NOTE: /reset-password is intentionally EXCLUDED — authenticated users
// (post-reset-link-click) must be able to access it to set their password.
const AUTH_ONLY_ROUTES = ["/login", "/signup", "/forgot-password"];

// Paths that bypass all middleware — no redirect, no session check
const BYPASS_PREFIXES = [
  "/auth/",    // /auth/callback, /auth/reset-password handler
  "/api/",     // all API routes
  "/_next/",   // Next.js internals
];

// Always public — no redirect regardless of auth state
const PUBLIC_ROUTES = ["/", "/reset-password"];

const TRIAL_COOKIE = "vmenu_trial";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Hard bypass — these routes handle their own auth
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // 2. Always-public routes — never redirect
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next({ request });
  }

  const response    = NextResponse.next({ request });
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly  = AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p));

  // 3. Free trial — check cookie BEFORE any Supabase call
  //    Trial users have no Supabase session so getUser() would return null.
  const isTrial = request.cookies.get(TRIAL_COOKIE)?.value === "active";
  if (isTrial) {
    // Trial users should not see login/signup pages
    if (isAuthOnly) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Allow trial users through to /dashboard and all other routes
    return response;
  }

  // 4. Validate real Supabase session (3s timeout — if Supabase is down,
  //    fail safe: treat as unauthenticated rather than hanging the whole site)
  const supabase = createSupabaseMiddlewareClient(request, response);
  let isAuthenticated = false;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);
    isAuthenticated = !result.error && !!result.data.user;
  } catch {
    // Supabase unreachable or timed out — let protected routes redirect to login
    isAuthenticated = false;
  }

  // Unauthenticated → block /dashboard
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → don't show login/signup (but ALLOW /reset-password)
  // Exception: /login?message=password_reset must always be accessible
  // so users who just reset their password see the login form instead
  // of being silently redirected to /dashboard.
  if (isAuthOnly && isAuthenticated) {
    const message = request.nextUrl.searchParams.get("message");
    if (pathname === "/login" && message === "password_reset") {
      // Let them through — they need to log in with their new password
      return response;
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
