// POST /api/ai/quality-check → menuai-v3 POST /ai/quality-check
import { NextRequest, NextResponse } from "next/server";
const NO_CACHE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const menuAiUrl = process.env.MENUAI_API_URL;
  if (!menuAiUrl) return NextResponse.json({ error: "MENUAI_API_URL not configured" }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  try {
    const r = await fetch(`${menuAiUrl}/ai/quality-check`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return NextResponse.json(await r.json(), { status: r.status, headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: "menuai-v3 backend unreachable" }, { status: 502, headers: NO_CACHE });
  }
}
