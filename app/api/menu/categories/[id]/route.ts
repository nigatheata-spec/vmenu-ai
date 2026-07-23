// app/api/menu/categories/[id]/route.ts
// GET / PUT / DELETE — real Supabase, no mock data

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient,
         createSupabaseAdminClient }                from "@/lib/supabase/server";
import type { CategoryDTO }                        from "@/types/api";

const NO_CACHE = { "Cache-Control": "no-store" };
const COLS     = "id, venue_id, name_ar, name_en, sort_order, emoji, visible";

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, timestamp: new Date().toISOString(), next_cursor: null }, { status });
}
function fail(code: string, message: string, message_ar: string, status: number) {
  return NextResponse.json({ code, message, message_ar }, { status });
}
function rowToDTO(row: Record<string, unknown>): CategoryDTO {
  return {
    id:         String(row.id),
    name_ar:    String(row.name_ar  ?? ""),
    name_en:    String(row.name_en  ?? ""),
    emoji:      String(row.emoji    ?? ""),
    visible:    Boolean(row.visible ?? true),
    sort_order: Number(row.sort_order ?? 99),
  };
}

// ── GET ───────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)               return unauthorized();
  if (!ctx.can("menu:read")) return forbidden();

  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("categories").select(COLS)
    .eq("id", id).eq("venue_id", ctx.venueId).maybeSingle();

  if (error) return fail("DB_ERROR", error.message, "خطأ في قاعدة البيانات", 500);
  if (!row)  return fail("NOT_FOUND", `Category "${id}" not found`, "القسم غير موجود", 404);
  return ok(rowToDTO(row as Record<string, unknown>));
}

// ── PUT ───────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                return unauthorized();
  if (!ctx.can("menu:write")) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Invalid JSON", "JSON غير صالح", 400); }
  if (typeof body !== "object" || body === null) {
    return fail("INVALID_BODY", "Body must be an object", "الجسم يجب أن يكون كائن", 400);
  }

  const input  = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (input.name_ar    !== undefined) updates.name_ar    = input.name_ar;
  if (input.name_en    !== undefined) updates.name_en    = input.name_en;
  if (input.emoji      !== undefined) updates.emoji      = input.emoji;
  if (input.visible    !== undefined) updates.visible    = Boolean(input.visible);
  if (input.sort_order !== undefined) updates.sort_order = Number(input.sort_order);

  // Verify exists via session client first
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("categories").select("id")
    .eq("id", id).eq("venue_id", ctx.venueId).maybeSingle();
  if (!existing) return fail("NOT_FOUND", `Category "${id}" not found`, "القسم غير موجود", 404);

  // Admin client for write (manager/marketing RLS bypass)
  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("categories").update(updates)
    .eq("id", id).eq("venue_id", ctx.venueId)
    .select(COLS).maybeSingle();

  if (error) return fail("DB_ERROR", error.message, "فشل التحديث", 500);
  if (!row)  return fail("NOT_FOUND", `Category "${id}" not found after update`, "القسم غير موجود", 404);
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
  if (!ctx)                return unauthorized();
  if (!ctx.can("menu:write")) return forbidden();

  const supabase = createSupabaseAdminClient();

  // Guard: refuse to delete a non-empty category (read via session client is fine)
  const { count } = await supabase
    .from("menu_items").select("id", { count: "exact", head: true })
    .eq("category_id", id).eq("venue_id", ctx.venueId);

  if (count && count > 0) {
    return fail(
      "CONFLICT",
      `Cannot delete category with ${count} item(s). Move or delete them first.`,
      `لا يمكن حذف القسم — يحتوي على ${count} صنف`,
      409,
    );
  }

  // Admin client for delete (manager/marketing RLS bypass)
  const admin = createSupabaseAdminClient();
  const { data: deleted, error } = await admin
    .from("categories").delete()
    .eq("id", id).eq("venue_id", ctx.venueId)
    .select("id").maybeSingle();

  if (error) return fail("DB_ERROR", error.message, "فشل الحذف", 500);
  if (!deleted) return fail("NOT_FOUND", `Category "${id}" not found`, "القسم غير موجود", 404);
  return NextResponse.json(
    { data: { deleted: true, id }, timestamp: new Date().toISOString(), next_cursor: null },
    { status: 200, headers: NO_CACHE },
  );
}
