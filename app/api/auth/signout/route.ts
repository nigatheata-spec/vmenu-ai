// =============================================================
// app/api/auth/signout/route.ts
//
// POST /api/auth/signout
//
// Called by AppShell's handleLogout via fetch().
// Signs out server-side so the session cookie is cleared
// at the HTTP level in the response headers.
//
// After this fetch() resolves, AppShell does:
//   window.location.href = "/"
// which is a hard browser navigation — the browser sends the
// now-cleared cookie with the "/" request, and the middleware
// correctly sees no session → renders the public landing page.
//
// Returns 200 JSON (not a redirect) because we're called via
// fetch(), not a form submit. The caller handles navigation.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();

  // Sign out server-side — SSR adapter writes Set-Cookie deletion headers
  await supabase.auth.signOut();

  // Also explicitly delete all Supabase auth cookies by name as a failsafe
  const response = NextResponse.json({ ok: true }, { status: 200 });
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
