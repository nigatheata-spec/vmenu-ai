"use client";

// =============================================================
// components/shared/RoleGate.tsx
//
// Declarative permission gate for any piece of UI.
// The backend is ALWAYS the real security enforcer (RLS + API 401/403).
// This component is purely for UX — hiding irrelevant UI from roles
// that don't need it, not as a security boundary.
//
// Usage patterns:
//
//   1. Single permission:
//      <RoleGate require="menu:write">
//        <EditButton />
//      </RoleGate>
//
//   2. Any of multiple permissions:
//      <RoleGate requireAny={["orders:update", "orders:close"]}>
//        <StatusButton />
//      </RoleGate>
//
//   3. Specific roles:
//      <RoleGate roles={["owner", "manager"]}>
//        <BillingSettings />
//      </RoleGate>
//
//   4. Fallback UI for unauthorized:
//      <RoleGate require="settings:billing" fallback={<UpgradeBanner />}>
//        <BillingPanel />
//      </RoleGate>
//
//   5. Just check in JSX (no wrapper needed):
//      const { can } = useRole();
//      {can("menu:write") && <DeleteButton />}
// =============================================================

import React from "react";
import { useRole }     from "@/hooks/useRole";
import type { Permission, NavRoute } from "@/lib/rbac";
import type { StaffRole }            from "@/types/supabase";

interface RoleGateProps {
  children:   React.ReactNode;
  /** Require this single permission */
  require?:   Permission;
  /** Require ANY one of these permissions */
  requireAny?: Permission[];
  /** Require ALL of these permissions */
  requireAll?: Permission[];
  /** Require the role to be one of these */
  roles?:     StaffRole[];
  /** What to render when access is denied (default: nothing) */
  fallback?:  React.ReactNode;
}

export function RoleGate({
  children,
  require,
  requireAny,
  requireAll,
  roles,
  fallback = null,
}: RoleGateProps) {
  const { role, can, canAny, isLoading } = useRole();

  // While session loads, render nothing (avoids flash of wrong UI)
  if (isLoading) return null;

  let allowed = true;

  if (require     && !can(require))                       allowed = false;
  if (requireAny  && !canAny(requireAny))                 allowed = false;
  if (requireAll  && !requireAll.every(can))              allowed = false;
  if (roles       && role && !roles.includes(role))       allowed = false;

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// ── Convenience wrappers ──────────────────────────────────────

/** Only renders for owners */
export function OwnerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGate roles={["owner"]} fallback={fallback}>{children}</RoleGate>;
}

/** Only renders for owners and managers */
export function ManagerUp({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGate roles={["owner", "manager"]} fallback={fallback}>{children}</RoleGate>;
}

/** Read-only action button — shown to all but disabled for roles that can't write */
export function WriteAction({
  permission,
  children,
  disabledLabel,
}: {
  permission: Permission;
  children: React.ReactNode;
  disabledLabel?: string;
}) {
  const { can, isLoading } = useRole();
  if (isLoading) return null;
  if (can(permission)) return <>{children}</>;
  if (disabledLabel) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--rx)]
                   text-xs text-[var(--c3)] cursor-not-allowed select-none"
        style={{ background: "var(--b3)", border: "1px solid var(--bd)" }}
        title={`Permission required: ${permission}`}
      >
        🔒 {disabledLabel}
      </span>
    );
  }
  return null;
}
