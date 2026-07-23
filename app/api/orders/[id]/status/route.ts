// =============================================================
// app/api/orders/[id]/status/route.ts
//
// PATCH /api/orders/:id/status
//
// Updates an order status. Each role can only perform certain
// transitions based on the RBAC matrix:
//
//   kitchen:  new → prep, prep → ready
//   waiter:   (can only create, not update status)
//   cashier:  ready → served  (close the order)
//   manager:  any transition
//   owner:    any transition
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type OrderStatus = "new" | "prep" | "ready" | "served";
type Params = { params: Promise<{ id: string }> };

// Which roles can transition from one status to another
const ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  { next: OrderStatus[]; roles: string[] }
> = {
  new:   { next: ["prep"],   roles: ["owner", "manager", "kitchen"] },
  prep:  { next: ["ready"],  roles: ["owner", "manager", "kitchen"] },
  ready: { next: ["served"], roles: ["owner", "manager", "cashier"] },
  served: { next: [],         roles: [] }, // terminal state
};

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx)                return unauthorized();
  if (!ctx.can("orders:update") && !ctx.can("orders:close")) {
    return forbidden("You cannot update order status");
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 }); }

  const { status: newStatus } = body as Record<string, unknown>;
  const VALID: OrderStatus[] = ["new", "prep", "ready", "served"];
  if (!newStatus || !VALID.includes(newStatus as OrderStatus)) {
    return NextResponse.json({ error: `status must be one of: ${VALID.join(", ")}`, code: "INVALID_STATUS" }, { status: 422 });
  }

  const supabase = createSupabaseAdminClient();

  // Fetch the order — RLS scopes this to the user's venue automatically
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, venue_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Ensure order belongs to caller's venue
  if (order.venue_id !== ctx.venueId) {
    return forbidden("Order does not belong to your venue");
  }

  const currentStatus = order.status as OrderStatus;
  const transition = ALLOWED_TRANSITIONS[currentStatus];

  // Check if the new status is a valid next step
  if (!transition.next.includes(newStatus as OrderStatus)) {
    return NextResponse.json({
      error:   `Cannot transition from "${currentStatus}" to "${newStatus}"`,
      code:    "INVALID_TRANSITION",
      allowed: transition.next,
    }, { status: 422 });
  }

  // Check if this role is allowed to make this specific transition
  if (!transition.roles.includes(ctx.role)) {
    return forbidden(
      `Your role (${ctx.role}) cannot change status from "${currentStatus}" to "${newStatus}"`
    );
  }

  // Apply the update
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message, code: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    data: { id, status: newStatus, updated_by: ctx.role }
  }, { status: 200 });
}
