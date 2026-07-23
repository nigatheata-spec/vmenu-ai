// =============================================================
// lib/supabase/actions.ts
//
// Server-side auth actions called from "use client" components
// via fetch("/api/auth/...") OR directly from Server Actions.
//
// Each function:
//   1. Talks to Supabase Auth
//   2. Resolves the user's venue + role from the DB
//   3. Returns a typed result (never throws — callers check .error)
// =============================================================

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { AuthSession, StaffRole } from "@/types/supabase";

// ── Result shape ──────────────────────────────────────────────
export interface AuthResult {
  session: AuthSession | null;
  error:   string | null;
}

// ── Sign in ───────────────────────────────────────────────────
export async function serverSignIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      session: null,
      error: error?.message ?? "Authentication failed",
    };
  }

  return resolveSession(data.user.id, data.user.email ?? email, supabase);
}

// ── Sign up ───────────────────────────────────────────────────
export interface SignUpOptions {
  city?:        string;
  phone?:       string;
  redirectTo?:  string; // full URL for email confirmation link
}

export interface SignUpResult extends AuthResult {
  /** true when email confirmation is required (no session yet) */
  needsEmailConfirmation?: boolean;
}

export async function serverSignUp(
  email:     string,
  password:  string,
  fullName:  string,
  venueName: string,
  opts:      SignUpOptions = {},
): Promise<SignUpResult> {
  const supabase = await createSupabaseServerClient();

  // 1. Create the auth user — store venue metadata so /auth/callback
  //    can create the venue after email confirmation without needing
  //    another form step.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name:   fullName,
        venue_name:  venueName,
        venue_slug:  slugify(venueName),
        venue_city:  opts.city  ?? "",
        venue_phone: opts.phone ?? "",
      },
      emailRedirectTo: opts.redirectTo,
    },
  });

  if (error) {
    return { session: null, error: error.message };
  }

  if (!data.user) {
    return { session: null, error: "Registration failed" };
  }

  // ── Email confirmation required ────────────────────────────
  // Supabase returns session=null when the user must confirm their
  // email first. Venue creation happens in /auth/callback after
  // the confirmation link is clicked.
  if (!data.session) {
    return { session: null, error: null, needsEmailConfirmation: true };
  }

  // ── Email confirmation disabled ────────────────────────────
  // Session is immediately available — create the venue now.
  const userId = data.user.id;
  const slug   = slugify(venueName);

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .insert({ name: venueName, slug, owner_id: userId })
    .select("id, name, slug")
    .single();

  if (venueError || !venue) {
    return {
      session: null,
      error: venueError?.message ?? "Failed to create venue",
    };
  }

  return {
    session: {
      userId,
      email,
      name:      fullName,
      venueId:   venue.id,
      venueName: venue.name,
      venueSlug: venue.slug,
      role:      "owner" as StaffRole,
      initial:   fullName.charAt(0).toUpperCase(),
    },
    error: null,
  };
}

// ── Sign out ──────────────────────────────────────────────────
export async function serverSignOut(): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

// ── Get current session ───────────────────────────────────────
// Returns null ONLY when the user is not authenticated at all.
// When authenticated but has no venue yet (just confirmed email,
// venue insert still pending), returns a partial session with
// venueId: "" so the dashboard can show a setup screen instead
// of redirecting to /login (which causes a redirect loop).

export async function getServerSession(): Promise<AuthSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Truly unauthenticated — no cookie or invalid JWT
  if (error || !user) return null;

  const result = await resolveSession(
    user.id,
    user.email ?? "",
    supabase,
  );

  // resolveSession returns null session when no venue found.
  // Instead of returning null (→ redirect to /login → redirect loop),
  // return a partial session so the dashboard can handle it gracefully.
  if (!result.session) {
    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "User";
    return {
      userId:    user.id,
      email:     user.email ?? "",
      name,
      venueId:   "",   // sentinel — means "venue not set up yet"
      venueName: "",
      venueSlug: "",
      role:      "owner" as import("@/types/supabase").StaffRole,
      initial:   name.charAt(0).toUpperCase(),
    };
  }

  return result.session;
}

// ── Internal: resolve venue + role from user id ───────────────
//
// Uses the admin (service-role) client for DB queries so RLS
// never blocks a legitimate authenticated user from reading
// their own venue. Auth is already verified by the caller via
// supabase.auth.getUser() before this function is called.
//
async function resolveSession(
  userId:   string,
  email:    string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<AuthResult> {
  const { data: authUser } = await supabase.auth.getUser();
  const name =
    (authUser.user?.user_metadata?.full_name as string | undefined) ?? email;

  // Use admin client so RLS never blocks a legitimate session lookup.
  const admin = createSupabaseAdminClient();

  // ── Step 1: Check if user owns a venue ───────────────────────
  const { data: ownedVenue } = await admin
    .from("venues")
    .select("id, name, slug")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownedVenue) {
    // Backfill staff_roles if missing
    await admin
      .from("staff_roles")
      .upsert(
        { user_id: userId, venue_id: ownedVenue.id, role: "owner" },
        { onConflict: "user_id,venue_id", ignoreDuplicates: true }
      );

    return {
      session: {
        userId,
        email,
        name,
        venueId:   ownedVenue.id,
        venueName: ownedVenue.name,
        venueSlug: ownedVenue.slug,
        role:      "owner" as StaffRole,
        initial:   name.charAt(0).toUpperCase(),
      },
      error: null,
    };
  }

  // ── Step 2: Check staff_roles for non-owner staff ─────────────
  const { data: roleRow, error: roleError } = await admin
    .from("staff_roles")
    .select("role, venue_id, venues(id, name, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (roleError || !roleRow) {
    // ── Step 3: Auto-recreate venue from signup metadata ──────────
    // If the venue is missing (e.g. after a DB restore), recreate it
    // automatically using the metadata stored during signUp so the
    // user is never permanently locked out.
    const { data: authUser2 } = await supabase.auth.getUser();
    const meta = authUser2.user?.user_metadata as Record<string, string | undefined> | undefined;
    const venueName = meta?.venue_name ?? name + "'s Restaurant";
    const venueSlug = meta?.venue_slug ?? slugify(venueName);

    // Handle slug collision
    let finalSlug = venueSlug;
    const { data: collision } = await admin
      .from("venues")
      .select("id")
      .eq("slug", venueSlug)
      .maybeSingle();
    if (collision) finalSlug = `${venueSlug}-${userId.slice(0, 4)}`;

    const { data: newVenue } = await admin
      .from("venues")
      .insert({ name: venueName, slug: finalSlug, owner_id: userId })
      .select("id, name, slug")
      .single();

    if (newVenue) {
      await admin
        .from("staff_roles")
        .upsert(
          { user_id: userId, venue_id: newVenue.id, role: "owner" },
          { onConflict: "user_id,venue_id", ignoreDuplicates: true }
        );
      return {
        session: {
          userId,
          email,
          name,
          venueId:   newVenue.id,
          venueName: newVenue.name,
          venueSlug: newVenue.slug,
          role:      "owner" as StaffRole,
          initial:   name.charAt(0).toUpperCase(),
        },
        error: null,
      };
    }

    return {
      session: null,
      error: "No venue found for this account. Please contact support.",
    };
  }

  const venueData = (roleRow.venues as unknown) as { id: string; name: string; slug: string } | null;

  if (!venueData) {
    return { session: null, error: "Venue data missing in staff_roles join" };
  }

  return {
    session: {
      userId,
      email,
      name,
      venueId:   venueData.id,
      venueName: venueData.name,
      venueSlug: venueData.slug,
      role:      (roleRow.role as StaffRole) ?? "manager",
      initial:   name.charAt(0).toUpperCase(),
    },
    error: null,
  };
}
