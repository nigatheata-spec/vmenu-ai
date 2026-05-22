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
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

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
  const venueSlug = meta.venue_slug ?? (venueName ? slugify(venueName) : undefined);

  if (venueName && venueSlug) {
    // Use the admin client (service role) to bypass RLS.
    // The RPC create_venue_for_owner uses auth.uid() internally,
    // but auth.uid() can return null in server route handlers when
    // the JWT hasn't propagated to PostgREST yet after exchangeCodeForSession.
    // Direct admin insert is reliable and safe here because we already
    // verified the user identity via exchangeCodeForSession above.
    const admin = createSupabaseAdminClient();

    // Idempotency: skip if venue already exists for this owner
    const { data: existing } = await admin
      .from("venues")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!existing) {
      // Handle slug collision by appending user id prefix
      let finalSlug = venueSlug;
      const { data: collision } = await admin
        .from("venues")
        .select("id")
        .eq("slug", venueSlug)
        .maybeSingle();
      if (collision) finalSlug = `${venueSlug}-${user.id.slice(0, 4)}`;

      const { data: newVenue, error: venueError } = await admin
        .from("venues")
        .insert({ name: venueName, slug: finalSlug, owner_id: user.id })
        .select("id")
        .single();

      if (venueError) {
        console.error("[auth/callback] venue insert failed:", venueError.message);
      } else if (newVenue) {
        await admin.from("staff_roles").upsert(
          { user_id: user.id, venue_id: newVenue.id, role: "owner" },
          { onConflict: "user_id,venue_id", ignoreDuplicates: true },
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
