// ============================================================
// Vmenu.ai — Shared TypeScript Types
// ============================================================

export type Lang = "ar" | "en";
export type Theme = "dark" | "light";
export type OrderStatus = "new" | "prep" | "ready" | "served";
export type TableStatus = "active" | "waiting" | "free";
export type ViewMode = "compact" | "standard" | "gallery" | "video";
export type PreviewSize = "small" | "medium" | "large";

// ---- Auth ----
export interface AuthUser {
  name: string;
  email: string;
  resto: string;
  slug: string;
  tables: number;
  city: string;
  phone: string;
  initial: string;
  /** RBAC role — from staff_roles table */
  role?: "owner" | "manager" | "kitchen" | "waiter" | "cashier" | "marketing";
}

// ---- Table ----
export interface RestaurantTable {
  id: number;
  num: number;
  scans: number;
  ordersCount: number;
  status: TableStatus;
  seats: number;
}

// ---- Menu ----
export interface Category {
  id: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  visible: boolean;
}

export interface MenuItem {
  /** Supabase UUID — stored as string to avoid hash collisions */
  id: string;
  categoryId: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  price: number;
  badge: string;
  available: boolean;
  images: string[];
}

// ---- Order ----
export interface OrderItem {
  itemId: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  tableId: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

// ---- Menu Theme ----
export interface MenuTheme {
  id: string;
  bg: string;
  titleColor: string;
  textDim: string;
  accent: string;
  accentText: string;
  cardBg: string;
  border: string;
  restName?: string;
  restSub?: string;
  viewMode?: ViewMode;
  previewSize?: PreviewSize;
  allowToggle?: boolean;
}

// ---- KPI ----
export interface KpiCard {
  icon: string;
  labelAr: string;
  labelEn: string;
  value: string | number;
  unit?: string;
  badge?: string;
  badgeType?: "success" | "info" | "warning";
  live?: boolean;
}

// ---- Promo ----
export interface Promo {
  id: string;
  title: string;
  description: string;
  discount: number;
  active: boolean;
  createdAt: string;
}

// ---- Settings ----
export interface AppSettings {
  audioAlerts: boolean;
  apiWarn: boolean;
  weeklyEmail: boolean;
  autoPromos: boolean;
  maxDiscount: number;
}

// ---- App State (global context) ----
export interface AppState {
  auth: AuthUser | null;
  lang: Lang;
  theme: Theme;
  route: string;
  tables: RestaurantTable[];
  categories: Category[];
  items: MenuItem[];
  orders: Order[];
  activePromos: Promo[];
  menuTheme: MenuTheme;
  settings: AppSettings;
}

// ---- Cart (guest) ----
export interface CartItem {
  itemId: string;
  qty: number;
  price: number;
  emoji: string;
  nameAr: string;
  nameEn: string;
}
