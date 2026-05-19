// =============================================================
// app/api/tables/numbers/route.ts
//
// GET /api/tables/numbers
//
// Lightweight endpoint that returns ONLY id + table_number.
// Accessible to ANY authenticated user — no role restriction.
// Used by the GuestMenu table picker so kitchen/cashier/marketing
// can resolve table_number → UUID when placing orders.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized } from "@/lib/getUserContext";
import { createSupabaseAdminClient }   from "@/lib/supabase/server";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx) return unauthorized();

  // Use admin client — bypasses RLS for a simple read scoped to venueId
  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("tables")
    .select("id, table_number, name")
    .eq("venue_id", ctx.venueId)
    .order("table_number", { ascending: true });

  if (error) {
    return NextResponse.json({ code: "DB_ERROR", message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: (rows ?? []).map(r => ({ id: String(r.id), table_number: Number(r.table_number), name: r.name ?? null })) },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
