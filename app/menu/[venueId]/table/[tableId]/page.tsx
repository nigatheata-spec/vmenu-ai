// =============================================================
// app/menu/[venueId]/table/[tableId]/page.tsx
//
// Public route — no authentication required.
// Rendered when a guest scans the QR code on a table.
// URL: /menu/{venue_slug}/table/{table_uuid}
//
// This is a Server Component that validates the venue + table
// exist before passing them to the client GuestMenu component.
// =============================================================

import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import GuestMenuPage                  from "@/components/menu/GuestMenuPage";

interface PageProps {
  params: Promise<{ venueId: string; tableId: string }>;
}

export default async function PublicMenuPage({ params }: PageProps) {
  const { venueId, tableId } = await params;

  const admin = createSupabaseAdminClient();

  // Fetch venue by slug (the URL uses the slug, not the UUID)
  const { data: venue } = await admin
    .from("venues")
    .select("id, name, slug")
    .eq("slug", venueId)
    .maybeSingle();

  if (!venue) notFound();

  // Validate the table belongs to this venue
  const { data: table } = await admin
    .from("tables")
    .select("id, table_number, status")
    .eq("id", tableId)
    .eq("venue_id", venue.id)
    .maybeSingle();

  if (!table) notFound();

  return (
    <GuestMenuPage
      venueId={venue.id}
      venueSlug={venue.slug}
      venueName={venue.name}
      tableId={table.id}
      tableNumber={table.table_number}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { venueId, tableId } = await params;
  const admin = createSupabaseAdminClient();

  const { data: venue } = await admin
    .from("venues")
    .select("name")
    .eq("slug", venueId)
    .maybeSingle();

  return {
    title: venue ? `${venue.name} — Menu` : "Restaurant Menu",
    description: `Scan to order from table`,
  };
}
