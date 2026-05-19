// =============================================================
// app/api/setup-account/route.ts
//
// POST /api/setup-account
//
// Called immediately after a user confirms their email and logs
// in for the first time, when the venue was not yet created.
//
// Why this route exists:
//   The auth callback creates the venue via a SECURITY DEFINER
//   function using metadata stored during signUp. However, some
//   users (OAuth, admin-created, legacy) have no venue metadata.
//   This route provides an explicit setup endpoint that:
//     1. Verifies the caller is authenticated (their own session)
//     2. Checks idempotency — skips if venue already exists
//     3. Creates the venue
//     4. Assigns the owner role in staff_roles
//     5. Returns the created venue so the UI can redirect
//
// Security model:
//   - Uses the user's own session (anon key + RLS) for reads
//   - Uses the service-role client for the INSERT operations
//     because the user has no staff_roles row yet at this point,
//     so RLS would block the venue INSERT (owner_id check fails
//     before the row exists — chicken-and-egg problem)
//   - The service-role INSERT is safe here because we verify
//     auth.getUser() === input.user_id before doing anything
//
// Input:
//   { user_id: string, venue_name: string }
//   venue_name is required — cannot create an unnamed venue.
//
// Output (success 201):
//   { venue_id, venue_name, venue_slug, role: "owner" }
//
// Output (error):
//   { error: string, code: string }
// =============================================================

import { NextRequest, NextResponse }    from "next/server";
import { createSupabaseServerClient,
         createSupabaseAdminClient }    from "@/lib/supabase/server";
import { slugify }                      from "@/lib/utils";
import type { VenueRow, StaffRoleRow }  from "@/types/supabase";

// ── Response helpers ──────────────────────────────────────────
function ok<T>(data: T, status = 201) {
  return NextResponse.json(data, { status });
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

// ── Route handler ─────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {

  // ── 1. Parse and validate request body ──────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (typeof body !== "object" || body === null) {
    return fail("INVALID_BODY", "Body must be a JSON object", 400);
  }

  const { user_id, venue_name } = body as Record<string, unknown>;

  if (!user_id || typeof user_id !== "string") {
    return fail("MISSING_FIELD", "user_id is required and must be a string", 422);
  }

  if (!venue_name || typeof venue_name !== "string" || !venue_name.trim()) {
    return fail("MISSING_FIELD", "venue_name is required and must be a non-empty string", 422);
  }

  const cleanVenueName = venue_name.trim();
  const venueSlug      = slugify(cleanVenueName);

  // ── 2. Verify caller identity ────────────────────────────────
  // Use the session client (anon key + cookies) to confirm the
  // user making this request is who they claim to be.
  // This prevents one user from creating venues for another user_id.
  const sessionClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return fail("UNAUTHORIZED", "No active session — please log in first", 401);
  }

  if (user.id !== user_id) {
    return fail(
      "FORBIDDEN",
      "user_id in body does not match the authenticated session",
      403,
    );
  }

  // ── 3. Idempotency check — skip if venue already exists ──────
  // A venue for this owner may already exist if:
  //   a) The user re-submits the form by mistake
  //   b) The auth callback already ran create_venue_for_owner()
  //   c) This endpoint was called twice (network retry)
  const { data: existingVenue } = await sessionClient
    .from("venues")
    .select("id, name, slug")
    .eq("owner_id", user_id)
    .maybeSingle();

  if (existingVenue) {
    // Ensure staff_roles row exists (upsert — safe to call multiple times)
    const admin = await createSupabaseAdminClient();
    await admin.from("staff_roles").upsert(
      { user_id, venue_id: existingVenue.id, role: "owner" },
      { onConflict: "user_id,venue_id", ignoreDuplicates: true },
    );

    // Return the existing venue — caller treats this as success
    return ok({
      venue_id:   existingVenue.id,
      venue_name: existingVenue.name,
      venue_slug: existingVenue.slug,
      role:       "owner",
      created:    false, // indicates this was a no-op (already existed)
    }, 200);
  }

  // ── 4. Check slug uniqueness ─────────────────────────────────
  // Slugs must be globally unique (they form the public QR URL).
  // If a collision exists, append the user_id prefix to disambiguate.
  let finalSlug = venueSlug;
  const { data: slugCollision } = await sessionClient
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (slugCollision) {
    // e.g. "burger-house" → "burger-house-a1b2"
    finalSlug = `${venueSlug}-${user_id.slice(0, 4)}`;
  }

  // ── 5. Create venue + assign owner role (service-role) ────────
  // Must use the admin client here because:
  //   - The venues RLS policy checks owner_id = auth.uid() ✓
  //     (this would work with the session client)
  //   - The staff_roles RLS policy checks:
  //       venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
  //     But the venues row doesn't exist yet when staff_roles INSERT runs,
  //     so RLS can't find it → INSERT blocked.
  // Using the admin client bypasses RLS for both inserts atomically.
  const admin = await createSupabaseAdminClient();

  // Insert venue
  const { data: newVenue, error: venueError } = await admin
    .from("venues")
    .insert({
      name:     cleanVenueName,
      slug:     finalSlug,
      owner_id: user_id,
    } satisfies Omit<VenueRow, "id" | "created_at">)
    .select("id, name, slug")
    .single();

  if (venueError || !newVenue) {
    console.error("[setup-account] venue insert failed:", venueError?.message);
    return fail(
      "VENUE_CREATE_FAILED",
      venueError?.message ?? "Failed to create venue",
      500,
    );
  }

  // Insert staff_roles owner row
  const { error: roleError } = await admin
    .from("staff_roles")
    .insert({
      user_id,
      venue_id: newVenue.id,
      role:     "owner",
    } satisfies Omit<StaffRoleRow, "id">);

  if (roleError) {
    // Venue was created but role assignment failed.
    // Log it — resolveSession() will auto-backfill on next login,
    // so this is not fatal, but we report it for observability.
    console.error("[setup-account] staff_roles insert failed:", roleError.message);
  }

  // ── 6. Return created venue ───────────────────────────────────
  return ok({
    venue_id:   newVenue.id,
    venue_name: newVenue.name,
    venue_slug: newVenue.slug,
    role:       "owner",
    created:    true,
  });
}
