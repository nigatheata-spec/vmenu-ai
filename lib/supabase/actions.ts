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

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
export async function serverSignUp(
  email:     string,
  password:  string,
  fullName:  string,
  venueName: string,
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();

  // 1. Create the auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }, // stored in auth.users.raw_user_meta_data
    },
  });

  if (error || !data.user) {
    return {
      session: null,
      error: error?.message ?? "Registration failed",
    };
  }

  const userId = data.user.id;

  // 2. Create the venue (the owner's restaurant)
  const slug = slugify(venueName);
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .insert({ name: venueName, slug, owner_id: userId })
    .select("id, name, slug")
    .single();

  if (venueError || !venue) {
    // Roll back the auth user if venue creation fails
    // (In production: use a DB trigger to create the venue instead)
    return {
      session: null,
      error: venueError?.message ?? "Failed to create venue",
    };
  }

  // 3. Assign owner role in staff_roles
  await supabase.from("staff_roles").insert({
    user_id:  userId,
    venue_id: venue.id,
    role:     "owner",
  });

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
// Strategy (matches the DB schema where owners live in venues.owner_id
// and staff live in staff_roles):
//
// 1. Check venues.owner_id first — if this user owns a venue,
//    they are always an owner regardless of staff_roles.
// 2. If not an owner, check staff_roles for a staff assignment.
// 3. If found as owner but missing from staff_roles, backfill
//    staff_roles automatically so future queries are faster.
//
async function resolveSession(
  userId:   string,
  email:    string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<AuthResult> {
  const { data: authUser } = await supabase.auth.getUser();
  const name =
    (authUser.user?.user_metadata?.full_name as string | undefined) ?? email;

  // ── Step 1: Check if user owns a venue ───────────────────────
  const { data: ownedVenue } = await supabase
    .from("venues")
    .select("id, name, slug")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownedVenue) {
    // User is an owner — backfill staff_roles if the row is missing.
    // This fixes the "No venue metadata" error for owners who signed up
    // before the staff_roles insert was added to the signup flow.
    await supabase
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
  const { data: roleRow, error: roleError } = await supabase
    .from("staff_roles")
    .select("role, venue_id, venues(id, name, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (roleError || !roleRow) {
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
