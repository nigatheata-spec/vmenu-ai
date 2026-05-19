// =============================================================
// lib/supabase/server.ts
//
// Server-side Supabase client factory.
// Use this in:
//   - Route Handlers (app/api/**)
//   - Server Components (any component without "use client")
//   - Server Actions
//
// Do NOT use this in:
//   - "use client" components  → use client.ts
//   - middleware.ts            → use the middleware helper below
//
// Why a factory (not a singleton)?
// In Next.js App Router, each request has its own cookie store.
// A singleton would share cookies across requests (security bug).
// The factory creates a fresh client bound to the current request.
// =============================================================

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

// ── Route Handler / Server Component client ───────────────────
// Call this inside a route handler or server component function,
// NOT at the module level (cookies() is request-scoped).

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — cookies cannot be
            // mutated here, but the middleware will refresh the session.
          }
        },
      },
    }
  );
}

// ── Admin / Service-role client ───────────────────────────────
// Bypasses RLS completely. Uses the base @supabase/supabase-js
// createClient (NOT createServerClient from @supabase/ssr) because
// createServerClient is designed for cookie-based sessions and does
// NOT reliably bypass RLS even with the service role key.
//
// Only createClient with the service role key + auth.persistSession:false
// + auth.autoRefreshToken:false truly bypasses RLS.
//
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set in .env.local\n" +
      "Add: SUPABASE_SERVICE_ROLE_KEY=eyJ... (from Supabase Dashboard → Settings → API)"
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    }
  );
}

// ── Middleware helper ─────────────────────────────────────────
// Used exclusively in middleware.ts. Receives the request and
// response objects directly (no next/headers available there).

import { type NextRequest, NextResponse } from "next/server";

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}
