// =============================================================
// app/auth/callback/route.ts
//
// Handles:
//   1. Email confirmation (signup): exchanges code → creates venue → /dashboard
//   2. Password reset (recovery):   exchanges code → /reset-password
//   3. Hash-based errors from Supabase (otp_expired, access_denied):
//      These arrive as URL hash fragments which servers can't read.
//      Supabase also sends them as query params in newer versions.
//      We handle both.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code         = searchParams.get("code");
  const type         = searchParams.get("type");         // "recovery" | "signup" | null
  const error        = searchParams.get("error");        // "access_denied" etc.
  const errorCode    = searchParams.get("error_code");   // "otp_expired" etc.
  const errorDesc    = searchParams.get("error_description");

  const isRecovery = type === "recovery";

  // ── Handle Supabase error redirects ───────────────────────────
  // When an email link expires or is already used, Supabase redirects to
  // the callback URL with error params (as query strings in newer versions,
  // or as hash fragments that get picked up by the browser's /auth/callback
  // client-side handler). We surface a meaningful message to the user.
  if (error || errorCode) {
    console.error("[auth/callback] Supabase error:", { error, errorCode, errorDesc });

    if (errorCode === "otp_expired" || errorDesc?.includes("expired")) {
      // Expired link — send to the appropriate page with a clear message
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/forgot-password?error=link_expired`);
      }
      return NextResponse.redirect(`${origin}/login?error=link_expired`);
    }

    if (error === "access_denied") {
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/forgot-password?error=access_denied`);
      }
      return NextResponse.redirect(`${origin}/login?error=access_denied`);
    }

    // Generic error
    if (isRecovery) {
      return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
    }
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  // ── No code and no error — hash-fragment error case ───────────
  // The hash (#error=...) is never sent to the server. When this route
  // gets hit with no code AND no error query params, it means the error
  // is only in the hash. We redirect to a client page that reads the hash.
  if (!code) {
    console.error("[auth/callback] No code — redirecting to client hash handler");
    // /auth/error is a client-side page that reads window.location.hash
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createSupabaseServerClient();

  // Exchange PKCE code → sets session cookie
  const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);

  if (codeError || !data.session || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", codeError?.message);
    if (isRecovery) {
      return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
    }
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // ── Password reset flow ──────────────────────────────────────
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // ── Signup confirmation flow ─────────────────────────────────
  const user = data.user;
  const meta = user.user_metadata as Record<string, string | undefined>;
  const venueName = meta.venue_name;
  const venueSlug = meta.venue_slug;

  if (venueName && venueSlug) {
    const { error: fnError } = await supabase.rpc("create_venue_for_owner", {
      p_name:     venueName,
      p_slug:     venueSlug,
      p_owner_id: user.id,
    });
    if (fnError) {
      console.error("[auth/callback] create_venue_for_owner failed:", fnError.message);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
