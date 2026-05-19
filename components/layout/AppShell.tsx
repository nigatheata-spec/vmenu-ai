"use client";

// =============================================================
// components/layout/AppShell.tsx
//
// Single shared dashboard shell for ALL roles.
// Role-based rendering works at two levels:
//
// Level 1 — Navigation (Sidebar):
//   Only routes the user's role can access are shown.
//   Filtered by getAllowedRoutes(role) from lib/rbac.ts.
//
// Level 2 — Route rendering (renderRoute):
//   Every case in the switch goes through a RoleGate.
//   If the user manually navigates to a forbidden route,
//   they see an <AccessDenied> screen instead of the view.
//   The backend ALSO returns 401/403 for any API calls,
//   so this is defense-in-depth, not security-by-UI.
//
// Level 3 — Within-view permissions:
//   Individual UI elements (edit buttons, delete actions, billing)
//   use <RoleGate> or can() inline so restricted roles see
//   a read-only variant of the same view.
// =============================================================

import React, { useState }    from "react";
import { useRouter }           from "next/navigation";
import { useApp }              from "@/lib/context";
import { useRole }             from "@/hooks/useRole";
import { supabase }            from "@/lib/supabase/client";
import { ROLE_META }           from "@/lib/rbac";
import Sidebar                 from "@/components/layout/Sidebar";
import TopBar                  from "@/components/layout/TopBar";
import Dashboard               from "@/components/dashboard/Dashboard";
import GuestMenu               from "@/components/menu/GuestMenu";
import TablesView              from "@/components/tables/TablesView";
import MenuEditor              from "@/components/menu/MenuEditor";
import OrdersView              from "@/components/orders/OrdersView";
import PhotoStudio             from "@/components/photo/PhotoStudio";
import VideoStudio             from "@/components/video/VideoStudio";
import AiPromos                from "@/components/promos/AiPromos";
import SettingsView            from "@/components/settings/SettingsView";
import { ToastContainer }      from "@/components/shared/ui";
import { useToast }            from "@/lib/useToast";
import { useMenuData }         from "@/hooks/useMenuData";
import type { Permission }     from "@/lib/rbac";

// ── Access denied screen ──────────────────────────────────────
function AccessDenied({ route }: { route: string }) {
  const { t }   = useApp();
  const { role } = useRole();
  const meta     = role ? ROLE_META[role] : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 gap-4">
      <div className="text-5xl">🔒</div>
      <div>
        <h2 className="text-xl font-black mb-1">
          {t("غير مصرح", "Access Denied")}
        </h2>
        <p className="text-sm text-[var(--c2)] max-w-[340px]">
          {t(
            `دورك (${meta?.labelAr ?? role}) لا يملك صلاحية الوصول لهذا القسم.`,
            `Your role (${meta?.labelEn ?? role}) does not have access to this section.`
          )}
        </p>
      </div>
      {meta && (
        <div
          className="px-4 py-2 rounded-full text-xs font-bold"
          style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          {t(meta.labelAr, meta.labelEn)} — {t(meta.descAr, meta.descEn)}
        </div>
      )}
    </div>
  );
}

// ── Permission guard wrapper ───────────────────────────────────
// Wraps a route's component with a permission check.
// IMPORTANT: must distinguish between:
//   a) role = undefined AND auth = null  → still loading → show spinner
//   b) role = undefined AND auth != null → role missing → show AccessDenied
//   c) role = "kitchen" but no permission → show AccessDenied
// The DashboardClient now waits until state.auth.role is set before
// rendering AppShell, so by the time GuardedRoute runs, role is always set.
function GuardedRoute({
  permission,
  route,
  children,
}: {
  permission: Permission;
  route: string;
  children: React.ReactNode;
}) {
  const { can, role } = useRole();

  // DashboardClient only renders AppShell after state.auth.role is set,
  // so by the time GuardedRoute runs, role is always defined.
  // This spinner is a safety net for any edge case where role is still missing.
  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
      </div>
    );
  }

  if (!can(permission)) {
    return <AccessDenied route={route} />;
  }

  return <>{children}</>;
}

// ── Main AppShell ─────────────────────────────────────────────
export default function AppShell({ isTrial = false }: { isTrial?: boolean }) {
  const { state, dispatch, t } = useApp();
  const { can, allowedRoutes }  = useRole();
  // Fetch real menu data for ALL roles — GuestMenu needs items+categories
  // Previously this only ran inside MenuEditor, so kitchen/waiter/cashier
  // saw mock data when routed to GuestMenu.
  useMenuData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, toast } = useToast();
  const router = useRouter();

  // ── Logout ─────────────────────────────────────────────────
  // Uses window.location.href (hard navigation) instead of router.push.
  //
  // WHY: router.push("/") is a client-side navigation — React keeps the
  // component tree alive, state.auth is still set, and useAuthSync's
  // SIGNED_OUT handler fires a competing router.push("/") a moment later.
  // Two competing navigations cause flicker and sometimes land on /dashboard.
  //
  // window.location.href is a full page reload:
  //   - All React state is destroyed (no stale auth)
  //   - The middleware runs fresh on "/"
  //   - The Supabase session cookie is already cleared by signOut()
  //   - useAuthSync cannot fire because the React tree is gone
  const handleLogout = async () => {
    if (!confirm(t("تسجيل الخروج؟", "Logout?"))) return;

    if (isTrial) {
      await fetch("/api/auth/demo", { method: "DELETE" });
    } else {
      // Server-side signout via the dedicated route to ensure the
      // session cookie is cleared at the HTTP level before navigation.
      await fetch("/api/auth/signout", { method: "POST" });
    }

    // Hard navigate to landing page — clears all React state.
    window.location.href = "/";
  };

  // ── Route guard: redirect to first allowed route ─────────────
  // FIX: This was calling dispatch() directly during render which causes
  // React to immediately re-render → dispatch again → infinite loop.
  // Moved into useEffect so it only fires after render, not during.
  const currentRoute = state.route;
  React.useEffect(() => {
    if (!allowedRoutes.length) return;
    const isAllowed = allowedRoutes.includes(currentRoute as any);
    if (!isAllowed) {
      const firstAllowed = allowedRoutes[0];
      if (firstAllowed) {
        dispatch({ type: "SET_ROUTE", payload: firstAllowed });
      }
    }
  }, [currentRoute, allowedRoutes, dispatch]);

  // ── Route → Component mapping with per-route permission ────
  const renderRoute = () => {
    switch (state.route) {

      case "dashboard":
        return (
          <GuardedRoute permission="dashboard:read" route="dashboard">
            <Dashboard
              onTableClick={() => dispatch({ type: "SET_ROUTE", payload: "tables" })}
            />
          </GuardedRoute>
        );

      case "tables":
        return (
          <GuardedRoute permission="tables:read" route="tables">
            <TablesView />
          </GuardedRoute>
        );

      case "menu":
        // menu:write → owner, manager, marketing get full MenuEditor
        // menu:read only (kitchen, waiter, cashier) → guest view, no editor
        // GuardedRoute handles the auth check; we split inside after the guard.
        return (
          <GuardedRoute permission="menu:read" route="menu">
            {can("menu:write")
              ? <MenuEditor />
              : <GuestMenu
                  tableId={state.tables[0]?.id ?? 1}
                  onClose={() => dispatch({ type: "SET_ROUTE", payload: "orders" })}
                />
            }
          </GuardedRoute>
        );

      case "orders":
        return (
          <GuardedRoute permission="orders:read" route="orders">
            <OrdersView />
          </GuardedRoute>
        );

      case "photo":
        return (
          <GuardedRoute permission="ai_studio:use" route="photo">
            <PhotoStudio />
          </GuardedRoute>
        );

      case "video":
        return (
          <GuardedRoute permission="ai_studio:use" route="video">
            <VideoStudio />
          </GuardedRoute>
        );

      case "promos":
        return (
          <GuardedRoute permission="promos:read" route="promos">
            <AiPromos />
          </GuardedRoute>
        );

      case "settings":
        return (
          <GuardedRoute permission="settings:read" route="settings">
            <SettingsView />
          </GuardedRoute>
        );

      case "guest_menu":
        return (
          <GuardedRoute permission="menu:guest_view" route="guest_menu">
            <GuestMenu tableId={state.tables[0]?.id ?? 1}
              onClose={() => dispatch({ type: "SET_ROUTE", payload: "menu" })} />
          </GuardedRoute>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--b0)]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen rtl:lg:mr-[220px] ltr:lg:ml-[220px]">
        <TopBar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto" id="view">
          {renderRoute()}
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
