// =============================================================
// app/api/ai/enhance/route.ts
//
// POST /api/ai/enhance
//
// Proxy to menuai-v3  →  POST /ai/enhance-photo
//
// Body:  { image_base64: string; style_preset?: string; aspect_ratio?: string }
// Returns: { status, image_url, ... } from menuai-v3
// =============================================================

import { NextRequest, NextResponse } from "next/server";

const NO_CACHE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const menuAiUrl = process.env.MENUAI_API_URL;
  if (!menuAiUrl) {
    return NextResponse.json(
      { error: "MENUAI_API_URL not configured. Add it to .env.local." },
      { status: 503, headers: NO_CACHE },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${menuAiUrl}/ai/enhance-photo`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status, headers: NO_CACHE });
  } catch (err) {
    console.error("[/api/ai/enhance]", err);
    return NextResponse.json(
      { error: "menuai-v3 backend unreachable. Is it running on " + menuAiUrl + "?" },
      { status: 502, headers: NO_CACHE },
    );
  }
}
