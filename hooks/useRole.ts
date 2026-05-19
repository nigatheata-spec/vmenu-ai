"use client";

// =============================================================
// hooks/useRole.ts
//
// Clean hook for reading the current user's role + permissions
// inside any "use client" component. Reads from AppContext so
// it's always in sync with the authenticated session.
//
// Usage:
//   const { role, can, isOwner, isKitchen } = useRole();
//   {can("menu:write") && <EditButton />}
// =============================================================

import { useApp }        from "@/lib/context";
import { hasPermission, getAllowedRoutes } from "@/lib/rbac";
import type { Permission, NavRoute }       from "@/lib/rbac";
import type { StaffRole }                  from "@/types/supabase";

export interface UseRoleReturn {
  /** Current role — undefined while session is loading */
  role:        StaffRole | undefined;
  /** true if role is loaded and has the given permission */
  can:         (permission: Permission) => boolean;
  /** true if role is loaded and has ANY of the permissions */
  canAny:      (permissions: Permission[]) => boolean;
  /** Nav routes this role is allowed to visit */
  allowedRoutes: NavRoute[];
  // Convenience booleans
  isOwner:     boolean;
  isManager:   boolean;
  isKitchen:   boolean;
  isWaiter:    boolean;
  isCashier:   boolean;
  isMarketing: boolean;
  /** true while role has not loaded yet */
  isLoading:   boolean;
}

export function useRole(): UseRoleReturn {
  const { state } = useApp();
  const role = state.auth?.role as StaffRole | undefined;
  const isLoading = !state.auth;

  const can    = (p: Permission) => role ? hasPermission(role, p) : false;
  const canAny = (ps: Permission[]) => ps.some(can);
  const allowedRoutes = role ? getAllowedRoutes(role) : [];

  return {
    role,
    can,
    canAny,
    allowedRoutes,
    isOwner:     role === "owner",
    isManager:   role === "manager",
    isKitchen:   role === "kitchen",
    isWaiter:    role === "waiter",
    isCashier:   role === "cashier",
    isMarketing: role === "marketing",
    isLoading,
  };
}
