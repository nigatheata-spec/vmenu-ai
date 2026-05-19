// =============================================================
// types/supabase.ts
//
// Database types derived from the drawSQL schema.
// These mirror the exact table/column names in Supabase so
// you get full autocomplete on .from("venues").select("slug").
//
// To auto-generate these in future:
//   npx supabase gen types typescript --project-id <id> > types/supabase.ts
// =============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─────────────────────────────────────────────────────────────
// Row types — exact shapes returned by SELECT *
// ─────────────────────────────────────────────────────────────

export interface VenueRow {
  id:         string;           // uuid
  name:       string;
  slug:       string;
  owner_id:   string | null;    // uuid → auth.users.id
  created_at: string | null;    // timestamp
}

export interface CategoryRow {
  id:         string;           // uuid
  venue_id:   string | null;    // uuid → venues.id
  name_ar:    string | null;
  name_en:    string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface MenuItemRow {
  id:             string;       // uuid
  venue_id:       string | null;
  category_id:    string | null;
  name_ar:        string | null;
  name_en:        string | null;
  description_ar: string | null;
  description_en: string | null;
  price:          number | null; // decimal
  image_url:      string | null;
  is_available:   boolean | null;
  created_at:     string | null;
}

export interface OrderRow {
  id:          string;          // uuid
  venue_id:    string | null;
  table_id:    string | null;   // uuid → tables.id
  status:      string | null;   // "new" | "prep" | "ready" | "served"
  total_price: number | null;   // decimal
  created_at:  string | null;
}

export interface OrderItemRow {
  id:           string;         // uuid
  order_id:     string | null;  // uuid → orders.id
  menu_item_id: string | null;  // uuid → menu_items.id
  quantity:     number | null;
  price:        number | null;  // decimal (price at time of order)
}

export interface TableRow {
  id:           string;         // uuid
  venue_id:     string | null;
  table_number: number | null;
  qr_code_url:  string | null;
  created_at:   string | null;
}

export interface StaffRoleRow {
  id:       string;             // uuid
  user_id:  string | null;      // uuid → auth.users.id
  venue_id: string | null;      // uuid → venues.id
  role:     string | null;      // "owner" | "manager" | "kitchen" | "waiter" | "cashier" | "marketing"
}

export interface MediaRow {
  id:         string;           // uuid
  venue_id:   string | null;
  type:       string | null;    // "photo" | "video" | "reel"
  url:        string | null;
  source:     string | null;    // "gemini" | "kling" | "hailuo" etc.
  created_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// Insert types — what you pass to .insert()
// ─────────────────────────────────────────────────────────────

export type VenueInsert = Omit<VenueRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type CategoryInsert = Omit<CategoryRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type MenuItemInsert = Omit<MenuItemRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type OrderInsert = Omit<OrderRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type StaffRoleInsert = Omit<StaffRoleRow, "id"> & { id?: string };

// ─────────────────────────────────────────────────────────────
// Staff roles union
// ─────────────────────────────────────────────────────────────

export type StaffRole = "owner" | "manager" | "kitchen" | "waiter" | "cashier" | "marketing";

// ─────────────────────────────────────────────────────────────
// Auth session payload stored in context after login
// ─────────────────────────────────────────────────────────────

export interface AuthSession {
  /** Supabase Auth user id */
  userId:   string;
  email:    string;
  name:     string;
  /** The venue this user owns or manages (first venue found) */
  venueId:   string;
  venueName: string;
  venueSlug: string;
  /** Role in this venue */
  role:      StaffRole;
  /** Display initial for the avatar */
  initial:   string;
}
