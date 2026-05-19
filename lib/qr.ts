// =============================================================
// lib/qr.ts
//
// QR code generation for table links.
//
// Each table gets a unique URL:
//   /menu/{venue_slug}/table/{table_id}
//
// The QR is generated as SVG (no canvas, works in Node.js/Edge)
// and optionally uploaded to Supabase Storage bucket "qr-codes".
// If storage is unavailable, the route returns the data URL directly.
// =============================================================

import QRCode from "qrcode";

export interface QRResult {
  /** SVG data-URL — always present, safe to put in <img src> */
  dataUrl:    string;
  /** Public CDN URL after upload to Supabase Storage (if upload succeeded) */
  storageUrl: string | null;
  /** The URL that is encoded inside the QR */
  targetUrl:  string;
}

/**
 * Build the menu URL that the QR code points to.
 * Public — no auth required (guests scan this).
 */
export function buildTableMenuUrl(
  venueSlug: string,
  tableId:   number | string,
): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/menu/${venueSlug}/table/${tableId}`;
}

/**
 * Generate an SVG QR code as a data-URL.
 * Works in both Node.js and Edge Runtime (no canvas dependency).
 */
export async function generateQRDataUrl(targetUrl: string): Promise<string> {
  return QRCode.toDataURL(targetUrl, {
    type:          "image/png",
    width:         400,
    margin:        2,
    color: {
      dark:  "#0a0a0f",   // dark squares — matches Vmenu dark theme
      light: "#ffffff",
    },
    errorCorrectionLevel: "H", // highest: survives logos/damage up to 30%
  });
}

/**
 * Generate QR as SVG string (lighter, scales infinitely).
 */
export async function generateQRSvgString(targetUrl: string): Promise<string> {
  return QRCode.toString(targetUrl, {
    type:   "svg",
    margin: 2,
    color: {
      dark:  "#0a0a0f",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Upload QR PNG buffer to Supabase Storage.
 * Returns the public CDN URL, or null if storage is not configured.
 */
export async function uploadQRToStorage(
  supabaseAdmin: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdminClient>,
  venueId:       string,
  tableId:       string | number,
  dataUrl:       string,
): Promise<string | null> {
  try {
    // Convert data URL to Uint8Array buffer
    const base64   = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer   = Buffer.from(base64, "base64");
    const filePath = `${venueId}/table-${tableId}.png`;
    const bucket   = "qr-codes";

    const { data: uploadData, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType:  "image/png",
        upsert:       true,
        cacheControl: "31536000", // 1 year — QR never changes
      });

    if (error) {
      console.warn("[uploadQRToStorage]", error.message);
      return null;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    return publicUrl;
  } catch (err) {
    console.warn("[uploadQRToStorage] unexpected:", err);
    return null;
  }
}
