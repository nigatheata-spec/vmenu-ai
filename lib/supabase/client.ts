// =============================================================
// lib/supabase/client.ts
//
// Browser-side Supabase client.
// Use this in:
//   - "use client" components
//   - Custom hooks (useAuth, useMenuData, etc.)
//   - Any file that runs in the browser
//
// Do NOT use this in:
//   - Route Handlers (app/api/**)   → use server.ts
//   - Server Components             → use server.ts
//   - middleware.ts                 → use middleware.ts helper
//
// This uses createBrowserClient from @supabase/ssr which
// automatically manages the session cookie so auth persists
// across page refreshes without any extra setup.
// =============================================================

import { createBrowserClient } from "@supabase/ssr";

// Validate env vars at module load time so the error is obvious
// in development rather than a cryptic "undefined" fetch failure.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
    "must be set in .env.local\n\n" +
    "  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n" +
    "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n"
  );
}

// Singleton — re-use the same instance across the entire browser session.
// createBrowserClient is idempotent so calling it multiple times is safe,
// but exporting a singleton avoids unnecessary object allocation.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ── Type-safe table helpers ───────────────────────────────────
// These thin wrappers give you autocomplete on column names
// without repeating the table name string everywhere.

export const db = {
  venues:      () => supabase.from("venues"),
  categories:  () => supabase.from("categories"),
  menuItems:   () => supabase.from("menu_items"),
  orders:      () => supabase.from("orders"),
  orderItems:  () => supabase.from("order_items"),
  tables:      () => supabase.from("tables"),
  staffRoles:  () => supabase.from("staff_roles"),
  media:       () => supabase.from("media"),
} as const;
