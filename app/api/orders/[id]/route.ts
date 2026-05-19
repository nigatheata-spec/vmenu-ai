// =============================================================
// app/api/orders/[id]/route.ts
//
// GET   /api/orders/:id   — fetch a single order with all items
// PATCH /api/orders/:id   — update status (replaces the separate /status route)
// DELETE /api/orders/:id  — delete order (owner/manager only)
//
// Status transitions by role:
//   received → preparing  : kitchen, manager, owner
//   preparing → ready     : kitchen, manager, owner
//   ready     → served    : cashier, manager, owner
//   served    → (terminal): no further transitions
//
// Both API names and DB names accepted in PATCH body:
//   "preparing" or "prep" are both valid
// =============================================================

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseServerClient,
         createSupabaseAdminClient }               from "@/lib/supabase/server";

const NO_CACHE = { "Cache-Control": "no-store" };
type Params    = { params: Promise<{ id: string }> };

// ── Status tables ─────────────────────────────────────────────

type DBStatus  = "new" | "prep" | "ready" | "served" | "cancelled";
type APIStatus = "received" | "preparing" | "ready" | "delivered" | "cancelled";

const API_TO_DB: Record<string, DBStatus> = {
  received:  "new",
  preparing: "prep",
  ready:     "ready",
  delivered: "served",
  cancelled: "cancelled",
  // raw DB values
  new: "new", prep: "prep", served: "served",
};

const DB_TO_API: Record<DBStatus, APIStatus> = {
  new:       "received",
  prep:      "preparing",
  ready:     "ready",
  served:    "delivered",
  cancelled: "cancelled",
};

// Strict RBAC transitions:
//   received  → preparing : kitchen (+ owner/manager)
//   preparing → ready     : kitchen (+ owner/manager)
//   ready     → delivered : WAITER ONLY (+ owner/manager)
//   any active → cancelled: cashier, waiter (+ owner/manager)
const TRANSITIONS: Record<DBStatus, { next: DBStatus[]; roles: string[] }> = {
  new:       { next: ["prep", "cancelled"],   roles: ["owner","manager","kitchen","cashier","waiter"] },
  prep:      { next: ["ready","cancelled"],   roles: ["owner","manager","kitchen","cashier","waiter"] },
  ready:     { next: ["served","cancelled"],  roles: ["owner","manager","waiter","cashier"] },
  served:    { next: [],                       roles: [] },
  cancelled: { next: [],                       roles: [] },
};

// Per-transition role overrides — more granular than TRANSITIONS
const TRANSITION_ROLES: Partial<Record<`${DBStatus}->${DBStatus}`, string[]>> = {
  "new->prep":       ["owner","manager","kitchen"],
  "prep->ready":     ["owner","manager","kitchen"],
  "ready->served":   ["owner","manager","waiter"],   // waiter delivers
  "new->cancelled":  ["owner","manager","cashier","waiter"],
  "prep->cancelled": ["owner","manager","cashier","waiter"],
  "ready->cancelled":["owner","manager","cashier","waiter"],
};

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

// ── GET /api/orders/:id ───────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                  return unauthorized();
  if (!ctx.can("orders:read")) return forbidden();

  const supabase = await createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("orders")
    .select(`
      id,
      table_id,
      venue_id,
      status,
      total_price,
      notes,
      created_at,
      updated_at,
      tables!table_id ( table_number ),
      order_items (
        id,
        menu_item_id,
        quantity,
        price,
        menu_items!menu_item_id ( name_ar, name_en, emoji )
      )
    `)
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (error) return fail("DB_ERROR", error.message, 500);
  if (!row)  return fail("NOT_FOUND", `Order "${id}" not found`, 404);

  const tableData = row.tables as unknown as { table_number: number } | null;
  const rawItems  = row.order_items as unknown as {
    id: string;
    menu_item_id: string;
    quantity: number;
    price: number;
    menu_items: { name_ar: string; name_en: string; emoji: string } | null;
  }[] ?? [];

  const items = rawItems.map((oi) => ({
    id:         oi.id,
    menu_item_id:    String(oi.menu_item_id),
    name_ar:    oi.menu_items?.name_ar ?? "",
    name_en:    oi.menu_items?.name_en ?? "",
    emoji:      oi.menu_items?.emoji   ?? "",
    quantity:   Number(oi.quantity),
    price: Number(oi.price),
    subtotal:   Number(oi.quantity) * Number(oi.price),
  }));

  const dbStatus = row.status as DBStatus;

  return NextResponse.json(
    {
      data: {
        id:           String(row.id),
        table_id:     row.table_id ? String(row.table_id) : null,
        table_number: tableData?.table_number ?? null,
        status:       DB_TO_API[dbStatus] ?? dbStatus,
        status_raw:   dbStatus,
        total_price:        Number(row.total_price),
        notes:        row.notes ?? null,
        items,
        created_at:   String(row.created_at),
        updated_at:   String(row.updated_at ?? row.created_at),
        next_statuses: TRANSITIONS[dbStatus]?.next.map((s) => DB_TO_API[s]) ?? [],
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: NO_CACHE },
  );
}

// ── PATCH /api/orders/:id ─────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)    return unauthorized();
  if (!ctx.can("orders:update") && !ctx.can("orders:close")) {
    return forbidden("You cannot update order status");
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Invalid JSON", 400); }

  const input = (body ?? {}) as Record<string, unknown>;
  const rawStatus = String(input.status ?? "");

  const newDbStatus = API_TO_DB[rawStatus];
  if (!newDbStatus) {
    return fail(
      "INVALID_STATUS",
      `status must be one of: received, preparing, ready, served (got "${rawStatus}")`,
      422,
    );
  }

  const supabase = await createSupabaseServerClient();

  // Fetch current order
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, status, venue_id")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (fetchErr || !order) return fail("NOT_FOUND", `Order "${id}" not found`, 404);

  const currentStatus = order.status as DBStatus;
  const transition    = TRANSITIONS[currentStatus];

  // Validate transition is allowed
  if (!transition.next.includes(newDbStatus)) {
    return NextResponse.json(
      {
        code:           "INVALID_TRANSITION",
        message:        `Cannot move from "${DB_TO_API[currentStatus]}" to "${DB_TO_API[newDbStatus] ?? rawStatus}"`,
        current_status: DB_TO_API[currentStatus],
        allowed_next:   transition.next.map((s) => DB_TO_API[s]),
      },
      { status: 422 },
    );
  }

  // Validate role permission for this specific transition
  const transitionKey = `${currentStatus}->${newDbStatus}` as `${DBStatus}->${DBStatus}`;
  const allowedRoles = TRANSITION_ROLES[transitionKey] ?? transition.roles;
  if (!allowedRoles.includes(ctx.role)) {
    return forbidden(
      `Role "${ctx.role}" cannot change status from "${DB_TO_API[currentStatus]}" to "${DB_TO_API[newDbStatus] ?? newDbStatus}"`
    );
  }

  // Apply update
  const admin = createSupabaseAdminClient();
  const { error: updateErr } = await admin
    .from("orders")
    .update({ status: newDbStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) return fail("DB_ERROR", updateErr.message, 500);

  const nextStatus = TRANSITIONS[newDbStatus];

  return NextResponse.json(
    {
      data: {
        id,
        previous_status: DB_TO_API[currentStatus],
        status:          DB_TO_API[newDbStatus],
        status_raw:      newDbStatus,
        updated_by:      ctx.role,
        next_statuses:   nextStatus.next.map((s) => DB_TO_API[s]),
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: NO_CACHE },
  );
}

// ── DELETE /api/orders/:id ────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                   return unauthorized();
  if (!ctx.can("orders:delete")) return forbidden();

  const supabase = await createSupabaseServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (!order) return fail("NOT_FOUND", `Order "${id}" not found`, 404);

  // Block deletion of active orders
  if (["new", "prep", "ready"].includes(order.status)) {
    return fail("CONFLICT", `Cannot delete an active order (status: ${DB_TO_API[order.status as DBStatus]}). Mark as served first.`, 409);
  }

  const admin = createSupabaseAdminClient();

  // Delete order items first (FK constraint)
  await admin.from("order_items").delete().eq("order_id", id);

  const { error: delErr } = await admin
    .from("orders")
    .delete()
    .eq("id", id);

  if (delErr) return fail("DB_ERROR", delErr.message, 500);

  return NextResponse.json(
    { data: { deleted: true, id }, timestamp: new Date().toISOString() },
    { status: 200, headers: NO_CACHE },
  );
}
