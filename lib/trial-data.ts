// =============================================================
// lib/trial-data.ts
//
// Server-side mock data for trial sessions.
// All API routes check the trial cookie and return this data
// instead of hitting Supabase, so trial users see a fully
// working dashboard without needing a real account.
// =============================================================

import { cookies }                               from "next/headers";
import { TRIAL_COOKIE_NAME, TRIAL_COOKIE_VALUE } from "@/lib/trial";

/** Returns true when the current request is a trial session. */
export async function isTrial(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(TRIAL_COOKIE_NAME)?.value === TRIAL_COOKIE_VALUE;
}

// ── Mock venue slug ───────────────────────────────────────────
export const TRIAL_VENUE_ID   = "trial-venue-demo";
export const TRIAL_VENUE_SLUG = "vmenu-demo";

// ── Categories ────────────────────────────────────────────────
export const TRIAL_CATEGORIES = [
  { id: "burgers",  name_ar: "برقر",    name_en: "Burgers",  emoji: "🍔", sort_order: 1, visible: true },
  { id: "pizza",    name_ar: "بيتزا",   name_en: "Pizza",    emoji: "🍕", sort_order: 2, visible: true },
  { id: "chicken",  name_ar: "دجاج",    name_en: "Chicken",  emoji: "🍗", sort_order: 3, visible: true },
  { id: "salads",   name_ar: "سلطات",   name_en: "Salads",   emoji: "🥗", sort_order: 4, visible: true },
  { id: "sides",    name_ar: "إضافات",  name_en: "Sides",    emoji: "🍟", sort_order: 5, visible: true },
  { id: "desserts", name_ar: "حلويات",  name_en: "Desserts", emoji: "🍰", sort_order: 6, visible: true },
  { id: "drinks",   name_ar: "مشروبات", name_en: "Drinks",   emoji: "🥤", sort_order: 7, visible: true },
];

// ── Menu items ────────────────────────────────────────────────
export const TRIAL_ITEMS = [
  { id: "mock-1", category_id: "burgers",  name_ar: "سماش برقر واجيو",   name_en: "Wagyu Smash",       description_ar: "لحم واجيو وجبنة شيدر",     description_en: "Wagyu beef & cheddar",     price: 59,  badge: "🔥", emoji: "🍔", image_url: "/burger.jpg", available: true },
  { id: "mock-2", category_id: "burgers",  name_ar: "برقر دجاج كرسبي",   name_en: "Crispy Chicken",    description_ar: "دجاج مقرمش وكول سلو",       description_en: "Crispy chicken & slaw",    price: 39,  badge: "",   emoji: "🍔", image_url: "/burger.jpg", available: true },
  { id: "mock-3", category_id: "pizza",    name_ar: "بيتزا مارقريتا",    name_en: "Margherita",        description_ar: "صوص سان مارزانو وموزاريلا", description_en: "San Marzano & mozzarella", price: 45,  badge: "",   emoji: "🍕", image_url: "",            available: true },
  { id: "mock-4", category_id: "pizza",    name_ar: "بيتزا ترافل",        name_en: "Truffle Pizza",     description_ar: "كريمة ترافل أسود",          description_en: "Black truffle cream",      price: 75,  badge: "⭐", emoji: "🍕", image_url: "",            available: true },
  { id: "mock-5", category_id: "chicken",  name_ar: "دجاج مشوي بالأعشاب",name_en: "Grilled Chicken",   description_ar: "نصف دجاجة مع أعشاب",        description_en: "Half chicken with herbs",  price: 65,  badge: "",   emoji: "🍗", image_url: "",            available: true },
  { id: "mock-6", category_id: "salads",   name_ar: "سلطة سيزر",          name_en: "Caesar Salad",      description_ar: "خس روماني وصوص سيزر",       description_en: "Romaine with Caesar",      price: 32,  badge: "",   emoji: "🥗", image_url: "",            available: true },
  { id: "mock-7", category_id: "sides",    name_ar: "بطاطس ترافل",        name_en: "Truffle Fries",     description_ar: "بطاطس بزيت الترافل",        description_en: "Fries with truffle oil",   price: 25,  badge: "",   emoji: "🍟", image_url: "",            available: true },
  { id: "mock-8", category_id: "desserts", name_ar: "تشيز كيك باسك",      name_en: "Basque Cheesecake", description_ar: "تشيز كيك محترقة",           description_en: "Burnt cheesecake",         price: 35,  badge: "",   emoji: "🍰", image_url: "",            available: true },
  { id: "mock-9", category_id: "drinks",   name_ar: "موهيتو فراولة",      name_en: "Strawberry Mojito", description_ar: "فراولة طازجة مع نعناع",     description_en: "Fresh strawberry & mint",  price: 22,  badge: "",   emoji: "🥤", image_url: "",            available: true },
];

// ── Tables (10 tables, some busy) ────────────────────────────
export const TRIAL_TABLES = Array.from({ length: 10 }, (_, i) => ({
  id:           `trial-table-${i + 1}`,
  table_number: i + 1,
  name:         null as string | null,
  seats:        4,
  status:       i < 3 ? "active" : i === 3 ? "waiting" : "free",
  qr_url:       null as string | null,
  qr_data_url:  null as string | null,
  menu_url:     `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/menu/${TRIAL_VENUE_SLUG}/table/trial-table-${i + 1}`,
  created_at:   new Date().toISOString(),
}));

// ── Orders (24 mock orders spread across last 10 hours) ───────
function makeMockOrders() {
  const now = Date.now();
  const statuses = ["served","served","served","served","ready","prep","new","new",
                    "served","served","served","prep","new","served","served","prep",
                    "served","served","ready","new","served","prep","served","served"];
  return Array.from({ length: 24 }, (_, i) => {
    const hoursAgo = (i % 10) + Math.random();
    const createdAt = new Date(now - hoursAgo * 3600000).toISOString();
    const items = [
      { id: `oi-${i}-1`, menu_item_id: TRIAL_ITEMS[i % TRIAL_ITEMS.length].id,
        name_ar: TRIAL_ITEMS[i % TRIAL_ITEMS.length].name_ar,
        name_en: TRIAL_ITEMS[i % TRIAL_ITEMS.length].name_en,
        emoji:   TRIAL_ITEMS[i % TRIAL_ITEMS.length].emoji,
        quantity: 1 + (i % 2),
        price:   TRIAL_ITEMS[i % TRIAL_ITEMS.length].price,
        subtotal: (1 + (i % 2)) * TRIAL_ITEMS[i % TRIAL_ITEMS.length].price },
    ];
    const total = items.reduce((s, x) => s + x.subtotal, 0);
    return {
      id:           `VM-${4800 + i}`,
      table_id:     TRIAL_TABLES[i % TRIAL_TABLES.length].id,
      table_number: (i % TRIAL_TABLES.length) + 1,
      status:       "received" as const,   // external API status
      status_raw:   statuses[i] ?? "served",
      items,
      total,
      created_at:   createdAt,
    };
  });
}

export const TRIAL_ORDERS = makeMockOrders();

// ── Dashboard KPIs (computed from mock orders) ────────────────
export function trialDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = TRIAL_ORDERS.filter(o =>
    o.created_at.startsWith(today) || true  // show all for trial
  ).slice(0, 24);

  const totalRevenue  = todayOrders.reduce((s, o) => s + o.total, 0);
  const activeOrders  = todayOrders.filter(o => ["new","prep","ready"].includes(o.status_raw));
  const avgTicket     = todayOrders.length > 0 ? Math.round(totalRevenue / todayOrders.length) : 0;
  const turnover      = parseFloat((todayOrders.length / TRIAL_TABLES.length).toFixed(2));

  const hourly = new Array<number>(24).fill(0);
  todayOrders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourly[h] = (hourly[h] ?? 0) + o.total;
  });

  const itemAgg: Record<string, { menu_item_id:string; name_ar:string; name_en:string; emoji:string; qty_sold:number; revenue:number }> = {};
  todayOrders.forEach(o => {
    o.items.forEach(item => {
      if (!itemAgg[item.menu_item_id]) {
        itemAgg[item.menu_item_id] = { menu_item_id: item.menu_item_id, name_ar: item.name_ar, name_en: item.name_en, emoji: item.emoji, qty_sold: 0, revenue: 0 };
      }
      itemAgg[item.menu_item_id]!.qty_sold += item.quantity;
      itemAgg[item.menu_item_id]!.revenue  += item.subtotal;
    });
  });
  const topItems = Object.values(itemAgg).sort((a, b) => b.qty_sold - a.qty_sold).slice(0, 10);

  return {
    date:   today,
    today:  { orders_count: todayOrders.length, revenue: Math.round(totalRevenue), avg_ticket: avgTicket, turnover },
    total:  { orders_count: todayOrders.length, revenue: Math.round(totalRevenue), items_in_menu: TRIAL_ITEMS.length, table_count: TRIAL_TABLES.length },
    active: { count: activeOrders.length, new: activeOrders.filter(o => o.status_raw === "new").length, prep: activeOrders.filter(o => o.status_raw === "prep").length, ready: activeOrders.filter(o => o.status_raw === "ready").length },
    hourly_revenue: hourly,
    top_items:      topItems,
    status_counts:  [
      { status: "served", count: 18 }, { status: "new", count: 3 },
      { status: "prep",   count: 2  }, { status: "ready", count: 1 },
    ],
  };
}
