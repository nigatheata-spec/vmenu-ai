// =============================================================
// app/api/orders/route.ts
//
// GET  /api/orders       — list orders for the venue (with filters)
// POST /api/orders       — create a new order with items
//
// Status lifecycle:
//   received → preparing → ready → served
//   (mapped from internal: new → prep → ready → served)
//
// Query params (GET):
//   ?status=received|preparing|ready|served|active
//   ?table_id=<uuid>
//   ?limit=N    (default 50, max 200)
//   ?offset=N   (default 0 — for pagination)
//   ?date=YYYY-MM-DD  (default: all time)
// =============================================================

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseServerClient,
         createSupabaseAdminClient }               from "@/lib/supabase/server";
import { isTrial, TRIAL_ORDERS }                  from "@/lib/trial-data";

const NO_CACHE = { "Cache-Control": "no-store" };

// ── Status mapping ────────────────────────────────────────────
// External API uses descriptive names; DB uses short names.
// Both are accepted in input and always returned in both forms.

type DBStatus  = "new" | "prep" | "ready" | "served";
type APIStatus = "received" | "preparing" | "ready" | "served";

const API_TO_DB: Record<APIStatus, DBStatus> = {
  received:  "new",
  preparing: "prep",
  ready:     "ready",
  served:    "served",
};

const DB_TO_API: Record<DBStatus, APIStatus> = {
  new:    "received",
  prep:   "preparing",
  ready:  "ready",
  served: "served",
};

function toAPIStatus(dbStatus: string): APIStatus {
  return DB_TO_API[dbStatus as DBStatus] ?? (dbStatus as APIStatus);
}

function toDBStatus(s: string): DBStatus | null {
  if (s in API_TO_DB) return API_TO_DB[s as APIStatus];
  if (["new", "prep", "ready", "served"].includes(s)) return s as DBStatus;
  return null;
}

// ── Response DTO ──────────────────────────────────────────────
interface OrderItemDTO {
  id:         string;
  menu_item_id:    string;
  name_ar:    string;
  name_en:    string;
  emoji:      string;
  quantity:   number;
  price: number;
  subtotal:   number;
}

interface OrderDTO {
  id:            string;
  table_id:      string | null;
  table_number:  number | null;
  status:        APIStatus;
  status_raw:    DBStatus;
  total_price:         number;
  notes:         string | null;
  items:         OrderItemDTO[];
  created_at:    string;
  updated_at:    string;
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

// ─────────────────────────────────────────────────────────────
// GET /api/orders
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (await isTrial()) {
    return NextResponse.json({ data: TRIAL_ORDERS, timestamp: new Date().toISOString() }, { status: 200, headers: NO_CACHE });
  }
  const ctx = await getUserContext();
  if (!ctx)                  return unauthorized();
  if (!ctx.can("orders:read")) return forbidden();

  const { searchParams } = req.nextUrl;

  const statusParam = searchParams.get("status");
  const tableId     = searchParams.get("table_id");
  const dateParam   = searchParams.get("date");
  const limit       = Math.min(parseInt(searchParams.get("limit")  ?? "50",  10) || 50,  200);
  const offset      =          parseInt(searchParams.get("offset") ?? "0",   10) || 0;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("orders")
    .select(`
      id,
      table_id,
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
    .eq("venue_id", ctx.venueId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Status filter — supports both API names and DB names, plus "active"
  if (statusParam) {
    if (statusParam === "active") {
      query = query.in("status", ["new", "prep", "ready"]);
    } else {
      const dbStatus = toDBStatus(statusParam);
      if (!dbStatus) return fail("INVALID_STATUS", `Unknown status: "${statusParam}"`, 422);
      query = query.eq("status", dbStatus);
    }
  }

  if (tableId) {
    query = query.eq("table_id", tableId);
  }

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    query = query
      .gte("created_at", `${dateParam}T00:00:00.000Z`)
      .lte("created_at", `${dateParam}T23:59:59.999Z`);
  }

  const { data: rows, error, count } = await query;

  if (error) {
    console.error("[GET /api/orders]", error.message);
    return fail("DB_ERROR", error.message, 500);
  }

  const orders: OrderDTO[] = (rows ?? []).map((row) => {
    const tableData = row.tables as unknown as { table_number: number } | null;
    const rawItems  = row.order_items as unknown as {
      id: string;
      menu_item_id: string;
      quantity: number;
      price: number;
      menu_items: { name_ar: string; name_en: string; emoji: string } | null;
    }[] ?? [];

    const items: OrderItemDTO[] = rawItems.map((oi) => ({
      id:         oi.id,
      menu_item_id:    String(oi.menu_item_id),
      name_ar:    oi.menu_items?.name_ar ?? "",
      name_en:    oi.menu_items?.name_en ?? "",
      emoji:      oi.menu_items?.emoji   ?? "",
      quantity:   Number(oi.quantity),
      price: Number(oi.price),
      subtotal:   Number(oi.quantity) * Number(oi.price),
    }));

    return {
      id:           String(row.id),
      table_id:     row.table_id ? String(row.table_id) : null,
      table_number: tableData?.table_number ?? null,
      status:       toAPIStatus(row.status as string),
      status_raw:   row.status as DBStatus,
      total_price:        Number(row.total_price),
      notes:        row.notes ? String(row.notes) : null,
      items,
      created_at:   String(row.created_at),
      updated_at:   String(row.updated_at ?? row.created_at),
    };
  });

  return NextResponse.json(
    {
      data:      orders,
      meta:      { total: count ?? orders.length, limit, offset },
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: NO_CACHE },
  );
}

// ─────────────────────────────────────────────────────────────
// POST /api/orders
//
// Creates an order with all its items in one atomic transaction.
//
// Body:
//   {
//     table_id?: string,     // UUID of the table (optional for takeaway)
//     notes?:    string,
//     items: [
//       { menu_item_id: string, quantity: number }
//     ]
//   }
//
// Prices are always fetched from the DB — never trusted from the client.
// Total is computed server-side from DB prices × quantities.
//
// Accessible by: all authenticated roles (guests via public RLS too)
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)                    return unauthorized();
  if (!ctx.can("orders:insert")) return forbidden("orders:insert permission required");
  // Note: all staff roles (owner/manager/kitchen/waiter/cashier/marketing) have orders:insert

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Request body must be valid JSON", 400); }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_BODY", "Body must be a JSON object", 400);
  }

  const input = body as Record<string, unknown>;

  // Validate items array
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return fail("MISSING_FIELD", "items must be a non-empty array", 422);
  }

  const rawItems = input.items as Record<string, unknown>[];
  for (const item of rawItems) {
    if (!item.menu_item_id || typeof item.menu_item_id !== "string") {
      return fail("INVALID_ITEM", "Each item must have a string menu_item_id", 422);
    }
    const qty = Number(item.quantity ?? item.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1) {
      return fail("INVALID_ITEM", `quantity for item "${item.menu_item_id}" must be a positive integer`, 422);
    }
  }

  const supabase = await createSupabaseServerClient();
  const admin    = createSupabaseAdminClient();

  // Fetch prices from DB — never use client-supplied prices
  const itemIds = rawItems.map((x) => String(x.menu_item_id));

  const { data: menuItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name_ar, name_en, emoji, price, is_available")
    .eq("venue_id", ctx.venueId)
    .in("id", itemIds);

  if (itemsError) return fail("DB_ERROR", itemsError.message, 500);

  // Validate all items exist and are available
  const itemMap = new Map(
    (menuItems ?? []).map((m) => [String(m.id), m]),
  );

  const unavailable: string[] = [];
  const notFound:    string[] = [];

  for (const id of itemIds) {
    if (!itemMap.has(id)) { notFound.push(id); continue; }
    if (!itemMap.get(id)!.is_available) unavailable.push(id);
  }

  if (notFound.length > 0) {
    return fail("ITEM_NOT_FOUND", `Items not found: ${notFound.join(", ")}`, 404);
  }
  if (unavailable.length > 0) {
    return fail("ITEM_UNAVAILABLE", `Items currently unavailable: ${unavailable.join(", ")}`, 422);
  }

  // Validate table belongs to this venue (if provided)
  if (input.table_id) {
    const { data: tableRow } = await supabase
      .from("tables")
      .select("id")
      .eq("id", String(input.table_id))
      .eq("venue_id", ctx.venueId)
      .maybeSingle();

    if (!tableRow) {
      return fail("TABLE_NOT_FOUND", `Table "${input.table_id}" not found in this venue`, 404);
    }
  }

  // Compute order total from DB prices
  let orderTotal = 0;
  const orderItems = rawItems.map((x) => {
    const menuItem = itemMap.get(String(x.menu_item_id))!;
    const qty      = Number(x.quantity ?? x.qty ?? 1);
    const price    = Number(menuItem.price);
    orderTotal         += qty * price;
    return {
      menu_item_id:    String(x.menu_item_id),
      quantity:   qty,
      price: price,
    };
  });

  // Insert order using admin client (owner RLS bypass for staff roles)
  const { data: newOrder, error: orderError } = await admin
    .from("orders")
    .insert({
      venue_id: ctx.venueId,
      table_id: input.table_id ? String(input.table_id) : null,
      status:   "new",              // always starts as "received"
      total_price:    Math.round(orderTotal * 100) / 100,
      notes:    input.notes ? String(input.notes) : null,
    })
    .select("id, table_id, status, total_price, notes, created_at")
    .single();

  if (orderError || !newOrder) {
    console.error("[POST /api/orders] order insert:", orderError?.message);
    return fail("DB_ERROR", orderError?.message ?? "Order insert failed", 500);
  }

  // Insert all order items
  const { data: insertedItems, error: itemsInsertError } = await admin
    .from("order_items")
    .insert(
      orderItems.map((oi) => ({ ...oi, order_id: newOrder.id })),
    )
    .select("id, menu_item_id, quantity, price");

  if (itemsInsertError) {
    // Rollback: delete the order if items failed
    await admin.from("orders").delete().eq("id", newOrder.id);
    console.error("[POST /api/orders] items insert:", itemsInsertError.message);
    return fail("DB_ERROR", itemsInsertError.message, 500);
  }

  // Build response with enriched item names
  const responseItems: OrderItemDTO[] = (insertedItems ?? []).map((oi) => {
    const menuItem = itemMap.get(String(oi.menu_item_id));
    return {
      id:         String(oi.id),
      menu_item_id:    String(oi.menu_item_id),
      name_ar:    menuItem?.name_ar ?? "",
      name_en:    menuItem?.name_en ?? "",
      emoji:      menuItem?.emoji   ?? "",
      quantity:   Number(oi.quantity),
      price: Number(oi.price),
      subtotal:   Number(oi.quantity) * Number(oi.price),
    };
  });

  const response: OrderDTO = {
    id:           String(newOrder.id),
    table_id:     newOrder.table_id ? String(newOrder.table_id) : null,
    table_number: null, // not fetched at creation time
    status:       "received",
    status_raw:   "new",
    total_price:        Number(newOrder.total_price),
    notes:        newOrder.notes ?? null,
    items:        responseItems,
    created_at:   String(newOrder.created_at),
    updated_at:   String(newOrder.created_at),
  };

  return NextResponse.json(
    { data: response, timestamp: new Date().toISOString() },
    { status: 201, headers: NO_CACHE },
  );
}
