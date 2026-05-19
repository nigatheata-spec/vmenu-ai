// =============================================================
// app/api/staff/route.ts
//
// GET  /api/staff  — list all staff for the owner's venue
// POST /api/staff  — invite a new staff member
//
// Permissions:
//   GET:  staff:read  (owner, manager)
//   POST: staff:write (owner, manager)
//
// POST body:
//   { email: string, password: string, name: string, role: StaffRole }
//
// What POST does:
//   1. Verify caller has staff:write permission
//   2. Create Supabase Auth user via admin client (service role)
//   3. Insert into staff_roles linking them to the caller's venue
//   4. Return the created user without the password
//
// Security: only owner/manager can invite. The new user is
// automatically scoped to the same venue as the inviter.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types/supabase";

// Roles that can be assigned to new staff (owners are created via signup only)
const ASSIGNABLE_ROLES: StaffRole[] = ["manager", "kitchen", "waiter", "cashier", "marketing"];

// ── GET /api/staff ────────────────────────────────────────────
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)             return unauthorized();
  if (!ctx.can("staff:read")) return forbidden("Only owners and managers can view staff");

  const admin = await createSupabaseAdminClient();

  // Fetch all staff_roles for this venue
  const { data: roles, error } = await admin
    .from("staff_roles")
    .select("id, user_id, role, venue_id")
    .eq("venue_id", ctx.venueId)
    .neq("role", "owner") // owners are visible separately
    .order("role");

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 });
  }

  // Enrich with email/name from auth.users via admin API
  const enriched = await Promise.all(
    (roles ?? []).map(async (row) => {
      const { data } = await admin.auth.admin.getUserById(row.user_id!);
      return {
        id:       row.id,
        user_id:  row.user_id,
        role:     row.role,
        email:    data.user?.email ?? "—",
        name:     (data.user?.user_metadata?.full_name as string | undefined) ?? "—",
      };
    })
  );

  return NextResponse.json({ data: enriched }, { status: 200 });
}

// ── POST /api/staff ───────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)              return unauthorized();
  if (!ctx.can("staff:write")) return forbidden("Only owners and managers can invite staff");

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 }); }

  const { email, password, name, role } = body as Record<string, unknown>;

  // Validate
  if (!email || typeof email !== "string")    return NextResponse.json({ error: "email required",    code: "MISSING_FIELD" }, { status: 422 });
  if (!password || typeof password !== "string") return NextResponse.json({ error: "password required", code: "MISSING_FIELD" }, { status: 422 });
  if (!name || typeof name !== "string")      return NextResponse.json({ error: "name required",     code: "MISSING_FIELD" }, { status: 422 });
  if (!role || !ASSIGNABLE_ROLES.includes(role as StaffRole)) {
    return NextResponse.json({
      error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
      code:  "INVALID_ROLE",
    }, { status: 422 });
  }

  // Managers cannot create other managers (only owners can)
  if (role === "manager" && !ctx.isOwner) {
    return forbidden("Only owners can assign the manager role");
  }

  if ((password as string).length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters", code: "WEAK_PASSWORD" }, { status: 422 });
  }

  const admin = await createSupabaseAdminClient();

  // 1. Create the auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:          email as string,
    password:       password as string,
    email_confirm:  true, // auto-confirm — owner invited them directly
    user_metadata:  { full_name: name as string },
  });

  if (authError || !authData.user) {
    // Handle "user already exists" gracefully
    if (authError?.message?.includes("already")) {
      return NextResponse.json({ error: "A user with this email already exists", code: "USER_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: authError?.message ?? "Failed to create user", code: "AUTH_ERROR" }, { status: 500 });
  }

  const newUserId = authData.user.id;

  // 2. Insert staff_roles row linking them to this venue
  const { error: roleError } = await admin.from("staff_roles").insert({
    user_id:  newUserId,
    venue_id: ctx.venueId,
    role:     role as StaffRole,
  });

  if (roleError) {
    // Rollback: delete the auth user if role insert fails
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: roleError.message, code: "ROLE_INSERT_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      user_id:  newUserId,
      email:    email as string,
      name:     name as string,
      role:     role as StaffRole,
      venue_id: ctx.venueId,
    }
  }, { status: 201 });
}
