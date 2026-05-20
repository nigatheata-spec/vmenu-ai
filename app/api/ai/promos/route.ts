// =============================================================
// app/api/ai/promos/route.ts
//
// POST /api/ai/promos
//
// Proxy to menuai-v3  →  POST /ai/analyze-promos
// menuai-v3 reads your Supabase sales data directly using the
// service key — the Next.js app just forwards venue_id.
// =============================================================

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";

const NO_CACHE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const menuAiUrl = process.env.MENUAI_API_URL;
  if (!menuAiUrl) {
    return NextResponse.json({ error: "MENUAI_API_URL not configured" }, { status: 503 });
  }

  const ctx = await getUserContext();
  if (!ctx)                   return unauthorized();
  if (!ctx.can("promos:read")) return forbidden();

  let body: Record<string, unknown> = {};
  try { body = await req.json().catch(() => ({})) as Record<string, unknown>; } catch {}

  try {
    const upstream = await fetch(`${menuAiUrl}/ai/analyze-promos`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...body, venue_id: ctx.venueId }),
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: NO_CACHE });
  } catch (err) {
    console.error("[/api/ai/promos]", err);
    return NextResponse.json({ error: "menuai-v3 backend unreachable" }, { status: 502, headers: NO_CACHE });
  }
}
