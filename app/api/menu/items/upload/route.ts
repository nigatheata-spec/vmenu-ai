// =============================================================
// app/api/menu/items/upload/route.ts
//
// POST /api/menu/items/upload
//
// Accepts a multipart/form-data request with:
//   file: File       — the image file (jpg/png/webp, max 5MB)
//   item_id: string  — the menu item UUID (optional, used for naming)
//
// Uploads to Supabase Storage bucket "menu-images".
// Returns the public URL to store in menu_items.image_url.
//
// Supabase Storage setup (run once):
//   Dashboard → Storage → New Bucket
//     Name: menu-images
//     Public: true (so QR menu guests can see images without auth)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient }               from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET        = "menu-images";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)                return unauthorized();
  if (!ctx.can("menu:write")) return forbidden("menu:write permission required");

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data", code: "INVALID_FORM" }, { status: 400 });
  }

  const file   = formData.get("file");
  const itemId = formData.get("item_id") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file field is required", code: "MISSING_FILE" }, { status: 422 });
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, code: "FILE_TOO_LARGE" },
      { status: 422 },
    );
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type "${file.type}" not allowed. Use JPEG, PNG, WebP or GIF`, code: "INVALID_TYPE" },
      { status: 422 },
    );
  }

  // Build a unique storage path: venue_id/item_id/timestamp.ext
  const ext       = file.type.split("/")[1].replace("jpeg", "jpg");
  const timestamp = Date.now();
  const fileName  = itemId
    ? `${ctx.venueId}/${itemId}/${timestamp}.${ext}`
    : `${ctx.venueId}/misc/${timestamp}.${ext}`;

  // Convert File to ArrayBuffer for Supabase
  const arrayBuffer = await file.arrayBuffer();
  const buffer      = new Uint8Array(arrayBuffer);

  const admin = createSupabaseAdminClient();

  const { data: uploadData, error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType:  file.type,
      upsert:       true,  // replace if same path (re-uploading for same item)
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[upload] Supabase storage error:", uploadError.message);

    // Common error: bucket doesn't exist
    if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("bucket")) {
      return NextResponse.json(
        {
          error: "Storage bucket 'menu-images' not found. Create it in Supabase Dashboard → Storage.",
          code: "BUCKET_NOT_FOUND",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: uploadError.message, code: "UPLOAD_ERROR" }, { status: 500 });
  }

  // Get the public URL
  const { data: { publicUrl } } = admin.storage
    .from(BUCKET)
    .getPublicUrl(uploadData.path);

  return NextResponse.json(
    {
      data: {
        url:  publicUrl,
        path: uploadData.path,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 201 },
  );
}
