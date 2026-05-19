// =============================================================
// app/(app)/layout.tsx
//
// Gate for all authenticated routes (/dashboard).
//
// FIXED (v14 regressions):
//
// BUG 2 FIX — Free trial bypassed here:
//   The old version called getServerSession() unconditionally.
//   Trial users have no Supabase session → returns null → redirect
//   to /login before the dashboard page even renders.
//   Fix: check the trial cookie FIRST and skip Supabase entirely.
//
// BUG 3 FIX — Removed double session check:
//   Both layout AND page were calling getServerSession(), causing
//   two Supabase round-trips per render and contributing to the
//   repeated GET /dashboard requests. Now layout only checks the
//   cookie/session minimally; the page handles the full session.
// =============================================================

import { cookies }  from "next/headers";
import { redirect }  from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Trial session — always allow through, no Supabase call
  const isTrial = cookieStore.get("vmenu_trial")?.value === "active";
  if (isTrial) {
    return <>{children}</>;
  }

  // Real Supabase session — one lightweight check (getUser is cached per request)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
