// =============================================================
// app/api/auth/route.ts
//
// Single route that handles all auth operations via action param.
// Keeps the client.ts thin — no SDK calls in the browser.
//
// POST /api/auth  body: { action, ...payload }
//   action = "signin"  → { email, password }
//   action = "signup"  → { email, password, fullName, venueName }
//   action = "signout" → {}
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  serverSignIn,
  serverSignUp,
  serverSignOut,
} from "@/lib/supabase/actions";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  // ── Sign in ────────────────────────────────────────────────
  if (action === "signin") {
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 422 },
      );
    }
    const result = await serverSignIn(String(email), String(password));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ session: result.session }, { status: 200 });
  }

  // ── Sign up ────────────────────────────────────────────────
  if (action === "signup") {
    const { email, password, fullName, venueName } = body;
    if (!email || !password || !fullName || !venueName) {
      return NextResponse.json(
        { error: "email, password, fullName and venueName are required" },
        { status: 422 },
      );
    }
    const result = await serverSignUp(
      String(email),
      String(password),
      String(fullName),
      String(venueName),
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ session: result.session }, { status: 201 });
  }

  // ── Sign out ───────────────────────────────────────────────
  if (action === "signout") {
    const result = await serverSignOut();
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
