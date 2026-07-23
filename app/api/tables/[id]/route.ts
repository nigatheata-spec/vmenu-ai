// =============================================================
// app/api/tables/[id]/route.ts
//
// GET    /api/tables/:id          — fetch single table + QR
// PUT    /api/tables/:id          — update table name/seats/status
// DELETE /api/tables/:id          — delete table (only if no active orders)
// =============================================================

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient,
         createSupabaseAdminClient }               from "@/lib/supabase/server";
import { buildTableMenuUrl }                       from "@/lib/qr";

const NO_CACHE = { "Cache-Control": "no-store" };

type Params = { params: Promise<{ id: string }> };

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

// ── GET /api/tables/:id ───────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                  return unauthorized();
  if (!ctx.can("tables:read")) return forbidden();

  const supabase = createSupabaseAdminClient();

  const [tableRes, venueRes] = await Promise.all([
    supabase
      .from("tables")
      .select("id, table_number, name, seats, status, qr_url, qr_data_url, menu_url, created_at")
      .eq("id", id)
      .eq("venue_id", ctx.venueId)
      .maybeSingle(),
    supabase
      .from("venues")
      .select("slug")
      .eq("id", ctx.venueId)
      .maybeSingle(),
  ]);

  if (tableRes.error) return fail("DB_ERROR", tableRes.error.message, 500);
  if (!tableRes.data) return fail("NOT_FOUND", `Table "${id}" not found`, 404);

  const row      = tableRes.data as Record<string, unknown>;
  const venueSlug = venueRes.data?.slug ?? ctx.venueId;
  const menuUrl  = String(row.menu_url ?? buildTableMenuUrl(venueSlug, id));

  return NextResponse.json(
    { data: { ...row, menu_url: menuUrl }, timestamp: new Date().toISOString() },
    { status: 200, headers: NO_CACHE },
  );
}

// ── PUT /api/tables/:id ───────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                   return unauthorized();
  if (!ctx.can("tables:write")) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Invalid JSON", 400); }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_BODY", "Body must be an object", 400);
  }

  const input   = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (input.name   !== undefined) updates.name   = input.name   ? String(input.name) : null;
  if (input.seats  !== undefined) updates.seats  = Number(input.seats);
  if (input.status !== undefined) {
    const validStatuses = ["free", "active", "waiting"];
    if (!validStatuses.includes(String(input.status))) {
      return fail("INVALID_STATUS", `status must be one of: ${validStatuses.join(", ")}`, 422);
    }
    updates.status = input.status;
  }

  if (Object.keys(updates).length === 0) {
    return fail("EMPTY_UPDATE", "No fields to update", 422);
  }

  const supabase = createSupabaseAdminClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("tables")
    .select("id")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (!existing) return fail("NOT_FOUND", `Table "${id}" not found`, 404);

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("tables")
    .update(updates)
    .eq("id", id)
    .select("id, table_number, name, seats, status, qr_url, qr_data_url, menu_url, created_at")
    .maybeSingle();

  if (error) return fail("DB_ERROR", error.message, 500);
  if (!row)  return fail("NOT_FOUND", `Table "${id}" not found after update`, 404);

  return NextResponse.json(
    { data: row, timestamp: new Date().toISOString() },
    { status: 200, headers: NO_CACHE },
  );
}

// ── DELETE /api/tables/:id ────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                   return unauthorized();
  if (!ctx.can("tables:manage")) return forbidden();

  const supabase = createSupabaseAdminClient();

  // Block deletion if there are active orders on this table
  const { count: activeOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("table_id", id)
    .in("status", ["new", "prep", "ready"]);

  if (activeOrders && activeOrders > 0) {
    return fail(
      "CONFLICT",
      `Cannot delete table with ${activeOrders} active order(s). Close them first.`,
      409,
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: deleted, error } = await admin
    .from("tables")
    .delete()
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .select("id")
    .maybeSingle();

  if (error) return fail("DB_ERROR", error.message, 500);
  if (!deleted) return fail("NOT_FOUND", `Table "${id}" not found`, 404);

  return NextResponse.json(
    { data: { deleted: true, id }, timestamp: new Date().toISOString() },
    { status: 200, headers: NO_CACHE },
  );
}
