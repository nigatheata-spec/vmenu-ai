// =============================================================
// app/api/tables/route.ts
//
// GET  /api/tables       — list all tables for the user's venue
// POST /api/tables       — create a new table (auto-generates QR)
//
// Auth:   tables:read / tables:write (from RBAC)
// Tenant: scoped to ctx.venueId from getUserContext()
// =============================================================

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseServerClient,
         createSupabaseAdminClient }               from "@/lib/supabase/server";
import { buildTableMenuUrl,
         generateQRDataUrl,
         uploadQRToStorage }                       from "@/lib/qr";
import { isTrial, TRIAL_TABLES }                  from "@/lib/trial-data";

const NO_CACHE = { "Cache-Control": "no-store" };

// ── DB row → response DTO ─────────────────────────────────────
interface TableDTO {
  id:          string;
  table_number: number;
  name:        string | null;
  seats:       number;
  status:      string;
  qr_url:      string | null;    // Supabase Storage public URL (may be null if upload failed)
  qr_data_url: string | null;    // base64 PNG — always generated, shown as fallback
  menu_url:    string;           // the URL encoded in the QR
  created_at:  string;
}

function rowToDTO(row: Record<string, unknown>, menuUrl: string): TableDTO {
  return {
    id:           String(row.id),
    table_number: Number(row.table_number ?? row.num ?? 0),
    name:         row.name    ? String(row.name) : null,
    seats:        Number(row.seats ?? 4),
    status:       String(row.status ?? "free"),
    qr_url:       row.qr_url       ? String(row.qr_url)       : null,
    qr_data_url:  row.qr_data_url  ? String(row.qr_data_url)  : null,
    menu_url:     menuUrl,
    created_at:   String(row.created_at ?? ""),
  };
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

// ─────────────────────────────────────────────────────────────
// GET /api/tables
// ─────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (await isTrial()) {
    return NextResponse.json({ data: TRIAL_TABLES, timestamp: new Date().toISOString() }, { status: 200, headers: NO_CACHE });
  }
  const ctx = await getUserContext();
  if (!ctx) return unauthorized();
  // Allow any role that can read tables OR place orders (needs table list for order form)
  if (!ctx.can("tables:read") && !ctx.can("orders:insert")) return forbidden();

  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("tables")
    .select("id, table_number, name, seats, status, qr_url, qr_data_url, created_at")
    .eq("venue_id", ctx.venueId)
    .order("table_number", { ascending: true });

  if (error) {
    console.error("[GET /api/tables]", error.message);
    return fail("DB_ERROR", error.message, 500);
  }

  // Fetch venue slug for menu URL construction
  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", ctx.venueId)
    .maybeSingle();

  const venueSlug = venue?.slug ?? ctx.venueId;

  const tables = (rows ?? []).map((row) => {
    const menuUrl = buildTableMenuUrl(venueSlug, String(row.id));
    return rowToDTO(row as Record<string, unknown>, menuUrl);
  });

  return NextResponse.json(
    { data: tables, timestamp: new Date().toISOString() },
    { status: 200, headers: NO_CACHE },
  );
}

// ─────────────────────────────────────────────────────────────
// POST /api/tables
//
// Creates a table AND generates its QR code in one atomic step.
//
// Flow:
//   1. Validate input
//   2. Insert table row (no QR yet)
//   3. Build the menu URL with the new table UUID
//   4. Generate QR data URL (PNG, base64)
//   5. Try to upload QR to Supabase Storage → get CDN URL
//   6. Update the table row with qr_url + qr_data_url
//   7. Return the complete table DTO
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)                   return unauthorized();
  if (!ctx.can("tables:manage")) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "Request body must be valid JSON", 400); }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_BODY", "Body must be a JSON object", 400);
  }

  const input = body as Record<string, unknown>;

  // table_number is required — must be unique within the venue
  if (input.table_number === undefined && input.num === undefined) {
    return fail("MISSING_FIELD", "table_number is required", 422);
  }

  const tableNumber = Number(input.table_number ?? input.num);
  if (!Number.isInteger(tableNumber) || tableNumber < 1) {
    return fail("VALIDATION_ERROR", "table_number must be a positive integer", 422);
  }

  const admin    = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

  // Check uniqueness within this venue
  const { data: existing } = await supabase
    .from("tables")
    .select("id")
    .eq("venue_id", ctx.venueId)
    .eq("table_number", tableNumber)
    .maybeSingle();

  if (existing) {
    return fail("CONFLICT", `Table number ${tableNumber} already exists in this venue`, 409);
  }

  // ── Step 2: Insert table (no QR yet) ─────────────────────────
  const { data: newRow, error: insertError } = await admin
    .from("tables")
    .insert({
      venue_id:     ctx.venueId,
      table_number: tableNumber,
      name:         input.name  ? String(input.name)  : null,
      seats:        input.seats ? Number(input.seats)  : 4,
      status:       "free",
    })
    .select("id, table_number, name, seats, status, created_at")
    .single();

  if (insertError || !newRow) {
    console.error("[POST /api/tables] insert:", insertError?.message);
    return fail("DB_ERROR", insertError?.message ?? "Insert failed", 500);
  }

  const tableId = String(newRow.id);

  // ── Step 3–5: Generate QR ────────────────────────────────────
  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", ctx.venueId)
    .maybeSingle();

  const venueSlug = venue?.slug ?? ctx.venueId;
  const menuUrl   = buildTableMenuUrl(venueSlug, tableId);

  // Generate PNG data URL (always works, no storage required)
  const dataUrl    = await generateQRDataUrl(menuUrl);

  // Try to upload to Storage (may fail if bucket doesn't exist)
  const storageUrl = await uploadQRToStorage(admin, ctx.venueId, tableId, dataUrl);

  // ── Step 6: Update row with QR data ──────────────────────────
  const { data: updatedRow, error: updateError } = await admin
    .from("tables")
    .update({
      qr_url:      storageUrl,   // CDN URL (null if storage unavailable)
      qr_data_url: dataUrl,      // base64 fallback — always set
      menu_url:    menuUrl,      // stored for quick reference
    })
    .eq("id", tableId)
    .select("id, table_number, name, seats, status, qr_url, qr_data_url, created_at")
    .single();

  if (updateError || !updatedRow) {
    // Table was created but QR update failed — still return the table
    console.warn("[POST /api/tables] QR update failed:", updateError?.message);
    const dto = rowToDTO({ ...newRow, qr_url: storageUrl, qr_data_url: dataUrl } as Record<string, unknown>, menuUrl);
    return NextResponse.json(
      { data: dto, timestamp: new Date().toISOString() },
      { status: 201, headers: NO_CACHE },
    );
  }

  return NextResponse.json(
    { data: rowToDTO(updatedRow as Record<string, unknown>, menuUrl), timestamp: new Date().toISOString() },
    { status: 201, headers: NO_CACHE },
  );
}
