// =============================================================
// app/(app)/dashboard/page.tsx
// =============================================================

import { cookies }           from "next/headers";
import { redirect }          from "next/navigation";
import { getServerSession }  from "@/lib/supabase/actions";
import DashboardClient       from "@/components/dashboard/DashboardClient";
import VenueSetupScreen      from "@/components/dashboard/VenueSetupScreen";
import type { AuthSession }  from "@/types/supabase";

// Mock session for the free trial
const TRIAL_SESSION: AuthSession = {
  userId:    "trial-user",
  email:     "trial@vmenu.ai",
  name:      "حساب تجريبي",
  venueId:   "trial-venue",
  venueName: "مطعم Vmenu التجريبي",
  venueSlug: "vmenu-demo",
  role:      "owner",
  initial:   "ت",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const isTrial = cookieStore.get("vmenu_trial")?.value === "active";

  // Free trial — skip Supabase entirely
  if (isTrial) {
    return <DashboardClient session={TRIAL_SESSION} isTrial />;
  }

  // Real session
  const session = await getServerSession();

  if (!session) redirect("/login");

  if (!session.venueId) {
    return <VenueSetupScreen session={session} />;
  }

  return <DashboardClient session={session} />;
}
