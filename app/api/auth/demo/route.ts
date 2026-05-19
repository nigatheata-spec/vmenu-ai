// =============================================================
// app/api/auth/demo/route.ts
//
// POST /api/auth/demo  — starts a free trial session
// DELETE /api/auth/demo — ends the trial session
//
// No Supabase involved. Sets a signed httpOnly cookie.
// Always available (not gated by NEXT_PUBLIC_DEMO_MODE).
// The middleware reads this cookie and allows /dashboard access.
// The dashboard page checks for the cookie and hydrates with
// rich mock data instead of fetching from Supabase.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { TRIAL_COOKIE_NAME, TRIAL_COOKIE_VALUE } from "@/lib/trial";

// 1-hour trial session
const TRIAL_MAX_AGE = 60 * 60;

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true, mode: "trial" });

  response.cookies.set(TRIAL_COOKIE_NAME, TRIAL_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    maxAge:   TRIAL_MAX_AGE,
    path:     "/",
  });

  return response;
}

export async function DELETE(_req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(TRIAL_COOKIE_NAME);
  return response;
}
