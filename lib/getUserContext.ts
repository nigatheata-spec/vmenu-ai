// =============================================================
// lib/getUserContext.ts
//
// Core RBAC context resolver for API routes and Server Components.
//
// Returns the authenticated user's identity + role + venue_id.
// Every protected API route calls this first.
//
// Usage in a route handler:
//   const ctx = await getUserContext();
//   if (!ctx)                          return unauthorized();
//   if (!ctx.can("menu:write"))        return forbidden();
//   // ... use ctx.venueId, ctx.role, ctx.userId
// =============================================================

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/rbac";
import type { Permission } from "@/lib/rbac";
export type { Permission };
import type { StaffRole } from "@/types/supabase";
import type { NextResponse } from "next/server";

// ── UserContext shape ─────────────────────────────────────────

export interface UserContext {
  /** Supabase Auth user id */
  userId:   string;
  /** User email */
  email:    string;
  /** The venue this user belongs to */
  venueId:  string;
  /** Their role in that venue */
  role:     StaffRole;

  // ── Permission helpers ──────────────────────────────────────

  /** true if the user has this specific permission */
  can:    (permission: Permission) => boolean;
  /** true if the user has ALL listed permissions */
  canAll: (permissions: Permission[]) => boolean;
  /** true if the user has ANY of the listed permissions */
  canAny: (permissions: Permission[]) => boolean;

  // ── Convenience booleans ────────────────────────────────────
  isOwner:     boolean;
  isManager:   boolean;
  isKitchen:   boolean;
  isWaiter:    boolean;
  isCashier:   boolean;
  isMarketing: boolean;
}

// ── Standard error responses ──────────────────────────────────

export function unauthorized(message = "Authentication required"): NextResponse {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
}

export function forbidden(message = "You don't have permission for this action"): NextResponse {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
}

// ── Core function ─────────────────────────────────────────────

/**
 * Resolves the current request's user identity + RBAC context.
 * Returns null when:
 *   - No valid session cookie (not authenticated)
 *   - User has no staff_roles row (account not fully set up)
 */
export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  // 2. Always check staff_roles first for the role value.
  //    This ensures managers and marketing staff get the CORRECT role,
  //    not "owner" just because venues.owner_id was used for venue lookup.
  //    The previous version checked venues.owner_id → returned "owner"
  //    for ALL venue queries. A manager who shares the same venue got
  //    "owner" role → BUT their staff_roles.role = "manager" is the truth.
  //
  //    New strategy:
  //    a) Query staff_roles for this user — get role + venue_id
  //    b) If not in staff_roles, check venues.owner_id as fallback
  //       (for owners who haven't been backfilled to staff_roles yet)
  const { data: roleRow } = await supabase
    .from("staff_roles")
    .select("role, venue_id")
    .eq("user_id", user.id)
    .order("role")           // "owner" sorts last alphabetically — picks staff role first
    .limit(1)
    .maybeSingle();

  if (roleRow?.venue_id && roleRow?.role) {
    return buildContext(user.id, user.email ?? "", roleRow.venue_id, roleRow.role as StaffRole);
  }

  // Fallback: check venues.owner_id (owner with missing staff_roles row)
  const { data: venueRow } = await supabase
    .from("venues")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (venueRow) {
    return buildContext(user.id, user.email ?? "", venueRow.id, "owner");
  }

  console.warn("[getUserContext] No role/venue found for user:", user.id);
  return null;
}

// ── Builder ───────────────────────────────────────────────────

function buildContext(
  userId:  string,
  email:   string,
  venueId: string,
  role:    StaffRole,
): UserContext {
  return {
    userId,
    email,
    venueId,
    role,

    can:    (p: Permission) => hasPermission(role, p),
    canAll: (ps: Permission[]) => hasAllPermissions(role, ps),
    canAny: (ps: Permission[]) => hasAnyPermission(role, ps),

    isOwner:     role === "owner",
    isManager:   role === "manager",
    isKitchen:   role === "kitchen",
    isWaiter:    role === "waiter",
    isCashier:   role === "cashier",
    isMarketing: role === "marketing",
  };
}
