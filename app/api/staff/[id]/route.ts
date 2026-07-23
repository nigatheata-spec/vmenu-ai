// =============================================================
// app/api/staff/[id]/route.ts
//
// DELETE /api/staff/:id  — remove a staff member from the venue
// PATCH  /api/staff/:id  — change a staff member's role
//
// :id is the staff_roles.id (uuid), NOT the user_id.
//
// Permissions: staff:write (owner, manager)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types/supabase";

type Params = { params: Promise<{ id: string }> };

// ── DELETE /api/staff/:id ─────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)              return unauthorized();
  if (!ctx.can("staff:write")) return forbidden();

  const admin = createSupabaseAdminClient();

  // Verify the staff_roles row belongs to this venue
  const { data: row, error: findError } = await admin
    .from("staff_roles")
    .select("id, user_id, role, venue_id")
    .eq("id", id)
    .eq("venue_id", ctx.venueId) // scoped to caller's venue
    .maybeSingle();

  if (findError || !row) {
    return NextResponse.json({ error: "Staff member not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Cannot remove an owner via this route
  if (row.role === "owner") {
    return forbidden("Cannot remove the venue owner");
  }

  // Managers cannot remove other managers
  if (row.role === "manager" && !ctx.isOwner) {
    return forbidden("Only the owner can remove managers");
  }

  // Delete the staff_roles row (user account is kept — they can exist in other venues)
  const { error: deleteError } = await admin
    .from("staff_roles")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message, code: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: true, id } }, { status: 200 });
}

// ── PATCH /api/staff/:id ──────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)              return unauthorized();
  if (!ctx.can("staff:write")) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 }); }

  const { role } = body as Record<string, unknown>;

  const ASSIGNABLE: StaffRole[] = ["manager", "kitchen", "waiter", "cashier", "marketing"];
  if (!role || !ASSIGNABLE.includes(role as StaffRole)) {
    return NextResponse.json({ error: `role must be one of: ${ASSIGNABLE.join(", ")}`, code: "INVALID_ROLE" }, { status: 422 });
  }

  if (role === "manager" && !ctx.isOwner) {
    return forbidden("Only owners can assign the manager role");
  }

  const admin = createSupabaseAdminClient();

  const { data: row } = await admin
    .from("staff_roles")
    .select("id, role, venue_id")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Staff member not found", code: "NOT_FOUND" }, { status: 404 });
  }

  if (row.role === "owner") {
    return forbidden("Cannot change the owner's role");
  }

  const { error: updateError } = await admin
    .from("staff_roles")
    .update({ role: role as StaffRole })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message, code: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data: { id, role } }, { status: 200 });
}
