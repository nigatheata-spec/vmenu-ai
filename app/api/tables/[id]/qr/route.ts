// =============================================================
// app/api/tables/[id]/qr/route.ts
//
// POST /api/tables/:id/qr
//
// Regenerates the QR code for a table.
// Use when:
//   - The app URL changed (e.g. moved from staging to production)
//   - The QR was corrupted or the Storage URL expired
//   - The venue slug changed
//
// Returns:
//   { qr_url, qr_data_url, menu_url }
//
// Also returns the SVG string if ?format=svg is passed,
// for direct printing without downloading an image.
// =============================================================

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseServerClient,
         createSupabaseAdminClient }               from "@/lib/supabase/server";
import { buildTableMenuUrl,
         generateQRDataUrl,
         generateQRSvgString,
         uploadQRToStorage }                       from "@/lib/qr";

const NO_CACHE = { "Cache-Control": "no-store" };
type Params    = { params: Promise<{ id: string }> };

export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                   return unauthorized();
  if (!ctx.can("tables:manage")) return forbidden();

  const format = new URL(req.url).searchParams.get("format"); // "svg" | null

  const supabase = await createSupabaseServerClient();

  // Verify table belongs to this venue
  const { data: table } = await supabase
    .from("tables")
    .select("id, table_number")
    .eq("id", id)
    .eq("venue_id", ctx.venueId)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ code: "NOT_FOUND", message: `Table "${id}" not found` }, { status: 404 });
  }

  // Build menu URL
  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", ctx.venueId)
    .maybeSingle();

  const venueSlug = venue?.slug ?? ctx.venueId;
  const menuUrl   = buildTableMenuUrl(venueSlug, id);

  // Return SVG string directly (for printing / display)
  if (format === "svg") {
    const svg = await generateQRSvgString(menuUrl);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400", // SVG is stable for 1 day
      },
    });
  }

  // Generate PNG + upload to Storage
  const admin      = createSupabaseAdminClient();
  const dataUrl    = await generateQRDataUrl(menuUrl);
  const storageUrl = await uploadQRToStorage(admin, ctx.venueId, id, dataUrl);

  // Update the table row
  await admin
    .from("tables")
    .update({ qr_url: storageUrl, qr_data_url: dataUrl, menu_url: menuUrl })
    .eq("id", id);

  return NextResponse.json(
    {
      data: {
        table_id:    id,
        menu_url:    menuUrl,
        qr_url:      storageUrl,    // CDN URL (null if storage not configured)
        qr_data_url: dataUrl,       // base64 PNG — always present
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: NO_CACHE },
  );
}
