// =============================================================
// app/api/auth/debug/route.ts
//
// GET /api/auth/debug
//
// Dev-only diagnostic endpoint. Checks:
//   1. Are env vars set?
//   2. Can we reach Supabase?
//   3. Is email/password auth enabled?
//   4. What is the exact error when signing in?
//
// Remove or disable this route before going to production.
// Protected by NODE_ENV check — returns 404 in production.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL:       process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ set" : "✗ MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ set" : "✗ MISSING",
    SUPABASE_SERVICE_ROLE_KEY:      process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `✓ set (starts with: ${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 10)}...)`
      : "✗ MISSING — staff management will fail with RLS error",
    NODE_ENV:                       process.env.NODE_ENV,
  };

  // 2. Try to reach Supabase
  try {
    const supabase = await createSupabaseServerClient();

    // Try a simple DB query that works even with RLS
    const { error: pingErr } = await supabase
      .from("venues")
      .select("count")
      .limit(0);

    results.database_reachable = pingErr
      ? `✗ Error: ${pingErr.message} (code: ${pingErr.code})`
      : "✓ Connected";

    // 3. Try sign in with a fake user to see the exact error shape
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email:    "debug_test_nonexistent@vmenu-debug.invalid",
      password: "debug_password_12345",
    });

    results.auth_signIn_test = {
      // We EXPECT an error here — we're testing with fake credentials.
      // What matters is WHAT kind of error we get:
      //   "Invalid login credentials" = auth works, creds wrong ← GOOD
      //   "Email logins are disabled"  = email auth is OFF ← must enable in Supabase
      //   "Network error"              = can't reach Supabase ← check URL/key
      expected_to_fail: true,
      error_message:    signInErr?.message ?? "No error (unexpected — fake creds should fail)",
      error_code:       (signInErr as { code?: string } | null)?.code ?? null,
      status:           signInErr ? "error (expected)" : "no error (unexpected)",
    };

    // 4. Check if the anon key can list auth settings
    const { data: session } = await supabase.auth.getSession();
    results.current_session = session.session ? "Active session found" : "No session (expected for server-side call)";

  } catch (err) {
    results.exception = String(err);
  }

  // 5. Summary diagnosis
  const signInMsg = (results.auth_signIn_test as Record<string, unknown>)?.error_message as string ?? "";
  let diagnosis = "";

  if (signInMsg.includes("Invalid login credentials")) {
    diagnosis = "✅ Auth is working. The 400 error means the email/password the user typed is genuinely wrong, OR the email has not been confirmed yet. Check: 1) User confirmed email. 2) Typed exactly the right password.";
  } else if (signInMsg.toLowerCase().includes("email") && signInMsg.toLowerCase().includes("disabled")) {
    diagnosis = "❌ Email/Password auth is DISABLED in your Supabase project. Go to: Supabase Dashboard → Authentication → Providers → Email → Enable it.";
  } else if (signInMsg.includes("signup")) {
    diagnosis = "❌ Signups are disabled. Go to: Supabase Dashboard → Authentication → Settings → Disable signup = OFF.";
  } else if (signInMsg.includes("network") || signInMsg.includes("fetch")) {
    diagnosis = "❌ Cannot reach Supabase. Check your NEXT_PUBLIC_SUPABASE_URL in .env.local.";
  } else {
    diagnosis = `⚠️ Unexpected error: "${signInMsg}". Check Supabase dashboard logs.`;
  }

  results.diagnosis = diagnosis;

  return NextResponse.json(results, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
