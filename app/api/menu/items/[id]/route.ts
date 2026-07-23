// =============================================================
// app/api/menu/items/[id]/route.ts
//
// GET    /api/menu/items/:id
// PUT    /api/menu/items/:id
// DELETE /api/menu/items/:id
//
// KEY: PUT and DELETE use the admin (service-role) client for
// the actual DB write so that manager / marketing roles can
// modify items. getUserContext() still enforces auth + RBAC.
//
// Why admin client for writes?
//   RLS policy menu_items_owner_update:
//     venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
//   This only matches the venue owner. Managers/marketing have
//   menu:write permission in our RBAC but their user_id is not
//   venues.owner_id → RLS blocks → 403 or silent 0 rows.
//   We verify permission in code (getUserContext + can("menu:write"))
//   and use admin client for the write. Security is code-enforced.
// =============================================================

import { NextRequest, NextResponse }                from "next/server";
import { getUserContext, unauthorized, forbidden }  from "@/lib/getUserContext";
import { createSupabaseAdminClient,
         createSupabaseAdminClient }                from "@/lib/supabase/server";
import type { MenuItemDTO }                         from "@/types/api";

const NO_CACHE  = { "Cache-Control": "no-store" };
const CACHE_30S = { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" };

const ITEM_COLUMNS =
  "id, venue_id, category_id, name_ar, name_en, description_ar, description_en, price, image_url, is_available, badge, emoji";

function rowToDTO(row: Record<string, unknown>): MenuItemDTO {
  return {
    id:             String(row.id),
    category_id:    String(row.category_id  ?? ""),
    name_ar:        String(row.name_ar       ?? ""),
    name_en:        String(row.name_en       ?? ""),
    description_ar: row.description_ar ? String(row.description_ar) : undefined,
    description_en: row.description_en ? String(row.description_en) : undefined,
    price:          Number(row.price         ?? 0),
    image_url:      String(row.image_url     ?? ""),
    available:      Boolean(row.is_available ?? true),
    badge:          String(row.badge         ?? ""),
    emoji:          String(row.emoji         ?? ""),
  };
}

function ok<T>(data: T, headers: Record<string, string> = CACHE_30S) {
  return NextResponse.json(
    { data, timestamp: new Date().toISOString(), next_cursor: null },
    { status: 200, headers },
  );
}
function fail(code: string, message: string, message_ar: string, status: number) {
  return NextResponse.json({ code, message, message_ar }, { status });
}

// ── GET ───────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                return unauthorized();
  if (!ctx.can("menu:read")) return forbidden();

  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("menu_items")
    .select(ITEM_COLUMNS)
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (error) return fail("DB_ERROR", error.message, "خطأ في قاعدة البيانات", 500);
  if (!row)  return fail("NOT_FOUND", `Item "${id}" not found`, "الصنف غير موجود", 404);
  return ok(rowToDTO(row as Record<string, unknown>));
}

// ── PUT ───────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                 return unauthorized();
  if (!ctx.can("menu:write")) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Invalid JSON", "JSON غير صالح", 400); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_BODY", "Body must be an object", "الجسم يجب أن يكون كائن", 400);
  }

  const input = body as Record<string, unknown>;

  if (input.price !== undefined) {
    const p = Number(input.price);
    if (!Number.isFinite(p) || p < 0) {
      return fail("VALIDATION_ERROR", "price must be non-negative", "السعر يجب أن يكون موجباً", 422);
    }
  }

  // Verify the item belongs to this venue first (read is ok via session client)
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (!existing) {
    return fail("NOT_FOUND", `Item "${id}" not found`, "الصنف غير موجود", 404);
  }

  // Build partial update — only fields that were sent
  const updates: Record<string, unknown> = {};
  if (input.name_ar        !== undefined) updates.name_ar        = input.name_ar;
  if (input.name_en        !== undefined) updates.name_en        = input.name_en;
  if (input.description_ar !== undefined) updates.description_ar = input.description_ar;
  if (input.description_en !== undefined) updates.description_en = input.description_en;
  if (input.price          !== undefined) updates.price          = Number(input.price);
  if (input.category_id    !== undefined) updates.category_id    = input.category_id;
  if (input.image_url      !== undefined) updates.image_url      = input.image_url || null;
  if (input.available      !== undefined) updates.is_available   = Boolean(input.available);
  if (input.badge          !== undefined) updates.badge          = input.badge || null;
  if (input.emoji          !== undefined) updates.emoji          = input.emoji || null;

  if (Object.keys(updates).length === 0) {
    return ok(rowToDTO(existing as Record<string, unknown>), NO_CACHE);
  }

  // Use admin client so manager / marketing can write (RLS only allows owner)
  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .eq("venue_id", ctx.venueId)  // explicit venue scope even with admin client
    .select(ITEM_COLUMNS)
    .maybeSingle();               // null on 0 rows, never throws

  if (error) {
    console.error(`[PUT /api/menu/items/${id}]`, error.message);
    return fail("DB_ERROR", error.message, "فشل التحديث", 500);
  }
  if (!row) {
    return fail("NOT_FOUND", `Item "${id}" not found after update`, "الصنف غير موجود", 404);
  }

  return NextResponse.json(
    { data: rowToDTO(row as Record<string, unknown>), timestamp: new Date().toISOString(), next_cursor: null },
    { status: 200, headers: NO_CACHE },
  );
}

// ── DELETE ────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                 return unauthorized();
  if (!ctx.can("menu:write")) return forbidden();

  // Verify ownership via session client
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (!existing) {
    return fail("NOT_FOUND", `Item "${id}" not found`, "الصنف غير موجود", 404);
  }

  // Admin client for the delete (same RLS bypass reason)
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("venue_id", ctx.venueId);

  if (error) {
    console.error(`[DELETE /api/menu/items/${id}]`, error.message);
    return fail("DB_ERROR", error.message, "فشل الحذف", 500);
  }

  return NextResponse.json(
    { data: { deleted: true, id }, timestamp: new Date().toISOString(), next_cursor: null },
    { status: 200, headers: NO_CACHE },
  );
}
