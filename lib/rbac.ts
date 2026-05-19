// =============================================================
// lib/rbac.ts
//
// Single source of truth for the RBAC permission matrix.
// Every API route and UI component imports from here — no
// hardcoded role strings scattered across the codebase.
//
// Permission matrix (from the UI spec image):
//
// Role        | Menu | Orders        | AI Studio | Dashboard | Promos | Settings
// ------------|------|---------------|-----------|-----------|--------|----------
// owner       | full | full          | full      | full      | full   | full+billing
// manager     | full | full          | full      | full      | full   | no billing
// kitchen     | read | KDS only      | ✗         | ✗         | ✗      | ✗
// waiter      | read | insert only   | ✗         | ✗         | ✗      | ✗
// cashier     | read | close+read    | ✗         | limited   | ✗      | ✗
// marketing   | full | ✗             | full      | read      | full   | ✗
// =============================================================

import type { StaffRole } from "@/types/supabase";

// ── Permission keys ───────────────────────────────────────────
// Each key maps to a specific capability checked in API routes.

export type Permission =
  // Menu
  | "menu:read"
  | "menu:write"          // create / update / delete items & categories
  | "menu:guest_view"     // open the guest QR menu preview
  // Orders
  | "orders:read"
  | "orders:insert"       // create new orders (waiter, guest)
  | "orders:update"       // change status (kitchen, cashier, manager, owner)
  | "orders:close"        // mark as served + process payment (cashier+)
  | "orders:delete"       // owner/manager only
  // AI Studio (photo, video, promos)
  | "ai_studio:use"
  | "promos:read"
  | "promos:write"
  // Dashboard / analytics
  | "dashboard:read"
  | "dashboard:full"      // includes revenue + all KPIs
  // Staff management
  | "staff:read"
  | "staff:write"         // add / remove / edit staff members
  // Settings
  | "settings:read"
  | "settings:write"
  | "settings:billing"    // API keys + billing — owner only
  // Tables / QR
  | "tables:read"    // fetch table list (waiter, owner, manager only — not kitchen/cashier/marketing)
  | "tables:write"   // waiter: change status only
  | "tables:manage"; // add / delete / QR — owner and manager only

// ── Permission matrix ─────────────────────────────────────────

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    "menu:read", "menu:write", "menu:guest_view",
    "orders:read", "orders:insert", "orders:update", "orders:close", "orders:delete",
    "ai_studio:use",
    "promos:read", "promos:write",
    "dashboard:read", "dashboard:full",
    "staff:read", "staff:write",
    "settings:read", "settings:write", "settings:billing",
    "tables:read", "tables:write", "tables:manage",
  ],

  manager: [
    "menu:read", "menu:write", "menu:guest_view",
    "orders:read", "orders:insert", "orders:update", "orders:close", "orders:delete",
    "ai_studio:use",
    "promos:read", "promos:write",
    "dashboard:read", "dashboard:full",
    "staff:read", "staff:write",
    "settings:read", "settings:write",
    "tables:read", "tables:write", "tables:manage",
    // No settings:billing
  ],

  kitchen: [
    "menu:read",
    "menu:guest_view",
    "orders:read",    // can view orders + live feed
    "orders:insert",  // can place orders for tables
    "orders:update",  // KDS: prep → ready
    // No tables — kitchen doesn't need table management
  ],

  waiter: [
    "menu:read",
    "menu:guest_view",
    "orders:read",
    "orders:insert",
    "orders:update",  // deliver: ready → served
    "tables:read",    // see table list + status
    "tables:write",   // change status: free / busy / reserved
    // No tables:manage — waiter cannot add/delete tables
  ],

  cashier: [
    "menu:read",
    "menu:guest_view",
    "orders:read",    // can view orders + live feed
    "orders:insert",  // can place orders for tables
    "orders:close",
    "orders:update",
    "dashboard:read",
    // No tables — cashier doesn't need table management
  ],

  marketing: [
    "menu:read", "menu:write", "menu:guest_view",
    "orders:read",    // needed for dashboard live orders feed
    "orders:insert",  // can place orders for tables
    "ai_studio:use",
    "promos:read", "promos:write",
    "dashboard:read",
    // No tables — marketing doesn't need table management
  ],
};

// ── Core RBAC functions ───────────────────────────────────────

/**
 * Check if a role has a specific permission.
 * Use this in API routes and server components.
 */
export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the required permissions.
 */
export function hasAllPermissions(role: StaffRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the required permissions.
 */
export function hasAnyPermission(role: StaffRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: StaffRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ── Nav visibility map ────────────────────────────────────────
// Controls which sidebar items each role can see.
// Used in Sidebar.tsx to filter NAV_ITEMS.

export type NavRoute =
  | "dashboard"
  | "tables"
  | "menu"
  | "guest_menu"
  | "photo"
  | "video"
  | "orders"
  | "promos"
  | "settings";

export const NAV_PERMISSIONS: Record<NavRoute, Permission> = {
  dashboard:  "dashboard:read",
  tables:     "tables:read",    // owner, manager, waiter only
  menu:       "menu:write",       // only editors (owner/manager/marketing) see this
  guest_menu: "menu:guest_view",  // kitchen/waiter/cashier see this instead
  photo:      "ai_studio:use",
  video:      "ai_studio:use",
  orders:     "orders:read",
  promos:     "promos:read",
  settings:   "settings:read",
};

/**
 * Returns the nav routes visible to a given role.
 */
export function getAllowedRoutes(role: StaffRole): NavRoute[] {
  return (Object.entries(NAV_PERMISSIONS) as [NavRoute, Permission][])
    .filter(([, perm]) => hasPermission(role, perm))
    .map(([route]) => route);
}

// ── Role display metadata (for UI) ────────────────────────────

export const ROLE_META: Record<StaffRole, {
  labelAr: string;
  labelEn: string;
  color:   string;
  descAr:  string;
  descEn:  string;
}> = {
  owner: {
    labelAr: "المالك",
    labelEn: "Owner",
    color:   "var(--ac)",
    descAr:  "وصول كامل + فوترة + API Keys",
    descEn:  "Full access + billing + API Keys",
  },
  manager: {
    labelAr: "المدير",
    labelEn: "Manager",
    color:   "var(--pp)",
    descAr:  "وصول كامل بدون فوترة",
    descEn:  "Full access without billing",
  },
  kitchen: {
    labelAr: "المطبخ",
    labelEn: "Kitchen",
    color:   "var(--wr)",
    descAr:  "قراءة المنيو + KDS فقط",
    descEn:  "Menu read + KDS only",
  },
  waiter: {
    labelAr: "النادل",
    labelEn: "Waiter",
    color:   "var(--in)",
    descAr:  "قراءة + إنشاء طلبات فقط",
    descEn:  "Read + create orders only",
  },
  cashier: {
    labelAr: "الكاشير",
    labelEn: "Cashier",
    color:   "var(--sc)",
    descAr:  "إغلاق طلبات + dashboard محدود",
    descEn:  "Close orders + limited dashboard",
  },
  marketing: {
    labelAr: "التسويق",
    labelEn: "Marketing",
    color:   "var(--pk)",
    descAr:  "محتوى + AI Studio + عروض",
    descEn:  "Content + AI Studio + promos",
  },
};
