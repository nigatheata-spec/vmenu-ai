// =============================================================
// app/api/menu/categories/route.ts
//
// GET  /api/menu/categories    — fetch all categories for the user's venue
// POST /api/menu/categories    — create a new category
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { CategoryDTO } from "@/types/api";
import { isTrial, TRIAL_CATEGORIES } from "@/lib/trial-data";

const NO_CACHE  = { "Cache-Control": "no-store" };
const CACHE_30S = { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" };

function ok<T>(data: T, cached = true) {
  return NextResponse.json(
    { data, timestamp: new Date().toISOString(), next_cursor: null },
    { status: 200, headers: cached ? CACHE_30S : NO_CACHE },
  );
}
function fail(code: string, message: string, message_ar: string, status: number) {
  return NextResponse.json({ code, message, message_ar }, { status });
}

// ─────────────────────────────────────────────────────────────
// GET /api/menu/categories
// ─────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (await isTrial()) {
    return ok(TRIAL_CATEGORIES as CategoryDTO[]);
  }
  const ctx = await getUserContext();
  if (!ctx)               return unauthorized();
  if (!ctx.can("menu:read")) return forbidden("menu:read permission required");

  try {
    const supabase = createSupabaseAdminClient();

    const { data: rows, error } = await supabase
      .from("categories")
      .select("id, venue_id, name, name_en, sort_order, created_at")
      .eq("venue_id", ctx.venueId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[GET /api/menu/categories] DB error:", error.message);
      return fail("DB_ERROR", error.message, "خطأ في قاعدة البيانات", 500);
    }

    const categories: CategoryDTO[] = (rows ?? []).map((row) => ({
      id:         row.id,
      name_ar:    (row as any).name ?? "",  // DB col: name = Arabic name
      name_en:    row.name_en ?? "",
      emoji:      "",
      visible:    true,
      sort_order: row.sort_order ?? 99,
    }));

    return ok(categories);
  } catch (err) {
    console.error("[GET /api/menu/categories]", err);
    return fail("INTERNAL_ERROR", "An unexpected error occurred", "خطأ غير متوقع", 500);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/menu/categories
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)                return unauthorized();
  if (!ctx.can("menu:write")) return forbidden("menu:write permission required");

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Request body must be valid JSON", "JSON غير صالح", 400); }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_BODY", "Body must be a JSON object", "الجسم يجب أن يكون كائن JSON", 400);
  }

  const input = body as Record<string, unknown>;

  if (!input.name_ar || !input.name_en) {
    return fail("VALIDATION_ERROR", "name_ar and name_en are required", "الاسم العربي والإنجليزي مطلوبان", 422);
  }

  try {
    // Admin client so manager/marketing can create categories (RLS only allows owner)
    const admin = createSupabaseAdminClient();

    const { data: row, error } = await admin
      .from("categories")
      .insert({
        venue_id:   ctx.venueId,
        name:       String(input.name_ar),  // DB col: name = Arabic name
        name_en:    String(input.name_en),
        sort_order: input.sort_order ? Number(input.sort_order) : 99,
      })
      .select("id, name, name_en, sort_order")
      .single();

    if (error || !row) {
      console.error("[POST /api/menu/categories] insert error:", error?.message);
      return fail("DB_ERROR", error?.message ?? "Insert failed", "فشل الإنشاء", 500);
    }

    const newCategory: CategoryDTO = {
      id:         row.id,
      name_ar:    (row as any).name ?? "",
      name_en:    row.name_en ?? "",
      emoji:      "",
      visible:    true,
      sort_order: row.sort_order ?? 99,
    };

    return NextResponse.json(
      { data: newCategory, timestamp: new Date().toISOString(), next_cursor: null },
      { status: 201, headers: NO_CACHE },
    );
  } catch (err) {
    console.error("[POST /api/menu/categories]", err);
    return fail("INTERNAL_ERROR", "An unexpected error occurred", "خطأ غير متوقع", 500);
  }
}
