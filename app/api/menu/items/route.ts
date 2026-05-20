// =============================================================
// app/api/menu/items/route.ts
// GET /api/menu/items   — fetch all items for the user's venue
// POST /api/menu/items  — create a new item
// =============================================================

import { NextRequest, NextResponse }                from "next/server";
import { getUserContext, unauthorized, forbidden }  from "@/lib/getUserContext";
import { createSupabaseServerClient,
         createSupabaseAdminClient }                from "@/lib/supabase/server";
import type { MenuItemDTO }                         from "@/types/api";
import { isTrial, TRIAL_ITEMS }                    from "@/lib/trial-data";

const NO_CACHE  = { "Cache-Control": "no-store" };
const CACHE_30S = { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" };

// All columns — badge and emoji are real DB columns
const ITEM_COLS = `
  id, venue_id, category_id,
  name_ar, name_en,
  description_ar, description_en,
  price, image_url, is_available,
  badge, emoji,
  created_at
`;

function ok<T>(data: T, cached = true) {
  return NextResponse.json(
    { data, timestamp: new Date().toISOString(), next_cursor: null },
    { status: 200, headers: cached ? CACHE_30S : NO_CACHE },
  );
}
function fail(code: string, message: string, message_ar: string, status: number) {
  return NextResponse.json({ code, message, message_ar }, { status });
}

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
    badge:          String(row.badge         ?? ""),  // real DB column
    emoji:          String(row.emoji         ?? ""),  // real DB column
  };
}

// ─────────────────────────────────────────────────────────────
// GET /api/menu/items
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (await isTrial()) {
    return ok(TRIAL_ITEMS as MenuItemDTO[]);
  }
  const ctx = await getUserContext();
  if (!ctx)               return unauthorized();
  if (!ctx.can("menu:read")) return forbidden("menu:read permission required");

  const { searchParams } = req.nextUrl;
  const categoryId     = searchParams.get("category_id");
  const availableParam = searchParams.get("available");

  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("menu_items")
      .select(ITEM_COLS)
      .eq("venue_id", ctx.venueId)
      .order("created_at", { ascending: true });

    if (categoryId)          query = query.eq("category_id", categoryId);
    if (availableParam !== null) query = query.eq("is_available", availableParam === "true");

    const { data: rows, error } = await query;

    if (error) {
      console.error("[GET /api/menu/items]", error.message);
      return fail("DB_ERROR", error.message, "خطأ في قاعدة البيانات", 500);
    }

    return ok((rows ?? []).map((r) => rowToDTO(r as Record<string, unknown>)));
  } catch (err) {
    console.error("[GET /api/menu/items] unexpected:", err);
    return fail("INTERNAL_ERROR", "Unexpected error", "خطأ غير متوقع", 500);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/menu/items
//
// Uses the admin (service-role) client for the INSERT so that
// manager / marketing roles can create items.
//
// Why admin client?
//   The menu_items RLS write policy is:
//     venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
//   This only matches the venue OWNER — managers and marketing
//   staff share the venue but their user_id is not venues.owner_id,
//   so the policy blocks their writes.
//
// Security: getUserContext() already verified the user is
// authenticated and has menu:write permission (owner / manager /
// marketing). The admin write is therefore authorised — we just
// bypass the RLS column check that was too narrow.
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)                return unauthorized();
  if (!ctx.can("menu:write")) return forbidden("menu:write permission required");

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Invalid JSON", "JSON غير صالح", 400); }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_BODY", "Body must be a JSON object", "الجسم يجب أن يكون كائن", 400);
  }

  const input = body as Record<string, unknown>;

  const required = ["name_ar", "name_en", "price", "category_id"] as const;
  const missing  = required.filter((f) => !input[f] && input[f] !== 0);
  if (missing.length) {
    return fail("VALIDATION_ERROR",
      `Missing required fields: ${missing.join(", ")}`,
      `حقول مطلوبة مفقودة: ${missing.join(", ")}`, 422);
  }

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    return fail("VALIDATION_ERROR", "price must be non-negative", "السعر يجب أن يكون موجباً", 422);
  }

  try {
    // Admin client bypasses RLS for manager/marketing writes
    const admin = createSupabaseAdminClient();

    const { data: row, error } = await admin
      .from("menu_items")
      .insert({
        venue_id:       ctx.venueId,                          // scoped to user's venue
        category_id:    String(input.category_id),
        name_ar:        String(input.name_ar),
        name_en:        String(input.name_en),
        description_ar: input.description_ar ? String(input.description_ar) : null,
        description_en: input.description_en ? String(input.description_en) : null,
        price,
        image_url:      input.image_url ? String(input.image_url) : null,
        is_available:   input.available !== undefined ? Boolean(input.available) : true,
        badge:          input.badge ? String(input.badge) : null,  // persist badge
        emoji:          input.emoji ? String(input.emoji) : null,  // persist emoji
      })
      .select(ITEM_COLS)
      .single();

    if (error || !row) {
      console.error("[POST /api/menu/items]", error?.message);
      return fail("DB_ERROR", error?.message ?? "Insert failed", "فشل الإنشاء", 500);
    }

    return NextResponse.json(
      { data: rowToDTO(row as Record<string, unknown>), timestamp: new Date().toISOString(), next_cursor: null },
      { status: 201, headers: NO_CACHE },
    );
  } catch (err) {
    console.error("[POST /api/menu/items] unexpected:", err);
    return fail("INTERNAL_ERROR", "Unexpected error", "خطأ غير متوقع", 500);
  }
}
