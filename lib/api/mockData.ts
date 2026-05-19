// ─────────────────────────────────────────────────────────────
// lib/api/mockData.ts
//
// Single source of truth for all mock API data.
//
// Design rules:
//   • Every function is pure — no module-level mutation.
//   • Data matches the exact MenuItemDTO / CategoryDTO wire shapes
//     so the route handlers can return it directly.
//   • Images use Unsplash source URLs (no API key required).
//   • Swap any function body for a real DB query when ready —
//     the route.ts files need zero changes.
// ─────────────────────────────────────────────────────────────

import type { MenuItemDTO, CategoryDTO, ApiEnvelope, ApiError } from "@/types/api";

// ─────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────

export function getMockCategories(): CategoryDTO[] {
  return [
    { id: "cat_burgers",  name_ar: "برقر",     name_en: "Burgers",   emoji: "🍔", visible: true, sort_order: 1 },
    { id: "cat_pizza",    name_ar: "بيتزا",    name_en: "Pizza",     emoji: "🍕", visible: true, sort_order: 2 },
    { id: "cat_chicken",  name_ar: "دجاج",     name_en: "Chicken",   emoji: "🍗", visible: true, sort_order: 3 },
    { id: "cat_salads",   name_ar: "سلطات",    name_en: "Salads",    emoji: "🥗", visible: true, sort_order: 4 },
    { id: "cat_sides",    name_ar: "إضافات",   name_en: "Sides",     emoji: "🍟", visible: true, sort_order: 5 },
    { id: "cat_desserts", name_ar: "حلويات",   name_en: "Desserts",  emoji: "🍰", visible: true, sort_order: 6 },
    { id: "cat_drinks",   name_ar: "مشروبات",  name_en: "Drinks",    emoji: "🥤", visible: true, sort_order: 7 },
  ];
}

export function getMockCategoryById(id: string): CategoryDTO | undefined {
  return getMockCategories().find((c) => c.id === id);
}

// ─────────────────────────────────────────────────────────────
// Items
// ─────────────────────────────────────────────────────────────

export function getMockItems(): MenuItemDTO[] {
  return [
    // ── Burgers ──────────────────────────────────────────────
    {
      id: "item_001",
      category_id: "cat_burgers",
      name_ar: "سماش برقر واجيو",
      name_en: "Wagyu Smash Burger",
      description_ar: "لحم واجيو مضغوط، جبنة شيدر معتقة، صلصة البيت",
      description_en: "Wagyu beef smash patty, aged cheddar & house sauce",
      price: 59,
      image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
      badge: "🔥",
      available: true,
      emoji: "🍔",
    },
    {
      id: "item_002",
      category_id: "cat_burgers",
      name_ar: "برقر دجاج كرسبي",
      name_en: "Crispy Chicken Burger",
      description_ar: "دجاج مقرمش، كول سلو طازج، صلصة رانش",
      description_en: "Crispy fried chicken fillet, fresh coleslaw & ranch",
      price: 39,
      image_url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🍔",
    },
    {
      id: "item_003",
      category_id: "cat_burgers",
      name_ar: "برقر مشروم تريفل",
      name_en: "Truffle Mushroom Burger",
      description_ar: "لحم بقري، مشروم مشوي، جبنة بري، زيت تريفل",
      description_en: "Beef patty, grilled mushroom, brie cheese & truffle oil",
      price: 65,
      image_url: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=600&q=80",
      badge: "⭐",
      available: true,
      emoji: "🍔",
    },

    // ── Pizza ─────────────────────────────────────────────────
    {
      id: "item_004",
      category_id: "cat_pizza",
      name_ar: "بيتزا مارقريتا",
      name_en: "Margherita Pizza",
      description_ar: "صوص سان مارزانو، موزاريلا طازجة، ريحان",
      description_en: "San Marzano tomato, fresh mozzarella & basil",
      price: 45,
      image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🍕",
    },
    {
      id: "item_005",
      category_id: "cat_pizza",
      name_ar: "بيتزا ترافل",
      name_en: "Black Truffle Pizza",
      description_ar: "كريمة ترافل أسود، موزاريلا، فطر بورتوبيلو",
      description_en: "Black truffle cream, mozzarella & portobello mushroom",
      price: 75,
      image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      badge: "⭐",
      available: true,
      emoji: "🍕",
    },

    // ── Chicken ───────────────────────────────────────────────
    {
      id: "item_006",
      category_id: "cat_chicken",
      name_ar: "دجاج مشوي بالأعشاب",
      name_en: "Herb Grilled Chicken",
      description_ar: "نصف دجاجة مشوية بالأعشاب، ثوم وليمون",
      description_en: "Half chicken grilled with herbs, garlic & lemon",
      price: 65,
      image_url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🍗",
    },
    {
      id: "item_007",
      category_id: "cat_chicken",
      name_ar: "تندر دجاج بالعسل",
      name_en: "Honey Chicken Tenders",
      description_ar: "قطع دجاج مقرمشة مع صلصة العسل والمسطردة",
      description_en: "Crispy chicken tenders with honey mustard glaze",
      price: 42,
      image_url: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=600&q=80",
      badge: "جديد",
      available: true,
      emoji: "🍗",
    },

    // ── Salads ────────────────────────────────────────────────
    {
      id: "item_008",
      category_id: "cat_salads",
      name_ar: "سلطة سيزر",
      name_en: "Classic Caesar Salad",
      description_ar: "خس روماني، خبز محمص، صوص سيزر، جبنة بارميزان",
      description_en: "Romaine lettuce, croutons, Caesar dressing & Parmesan",
      price: 32,
      image_url: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🥗",
    },
    {
      id: "item_009",
      category_id: "cat_salads",
      name_ar: "سلطة فتوش",
      name_en: "Fattoush Salad",
      description_ar: "خضروات طازجة، خبز مقرمش، سماق، صوص ليموني",
      description_en: "Fresh vegetables, pita chips, sumac & lemon dressing",
      price: 28,
      image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🥗",
    },

    // ── Sides ─────────────────────────────────────────────────
    {
      id: "item_010",
      category_id: "cat_sides",
      name_ar: "بطاطس ترافل",
      name_en: "Truffle Fries",
      description_ar: "بطاطس مقلية بزيت الترافل وجبنة بارميزان",
      description_en: "Crispy fries tossed in truffle oil & Parmesan",
      price: 25,
      image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🍟",
    },
    {
      id: "item_011",
      category_id: "cat_sides",
      name_ar: "حلقات البصل",
      name_en: "Onion Rings",
      description_ar: "حلقات بصل مقرمشة مع صلصة BBQ",
      description_en: "Golden crispy onion rings with smoky BBQ sauce",
      price: 18,
      image_url: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🍟",
    },

    // ── Desserts ──────────────────────────────────────────────
    {
      id: "item_012",
      category_id: "cat_desserts",
      name_ar: "تشيز كيك باسك",
      name_en: "Basque Burnt Cheesecake",
      description_ar: "تشيز كيك محترقة بالطريقة الباسكية الأصيلة",
      description_en: "Authentic Basque-style burnt cheesecake, served warm",
      price: 35,
      image_url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80",
      badge: "🏆",
      available: true,
      emoji: "🍰",
    },
    {
      id: "item_013",
      category_id: "cat_desserts",
      name_ar: "كنافة بالقشطة",
      name_en: "Kunafa with Cream",
      description_ar: "كنافة ناعمة بالقشطة الطازجة وقطر الزهر",
      description_en: "Fine kunafa with fresh cream & rose water syrup",
      price: 30,
      image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
      badge: "🔥",
      available: true,
      emoji: "🍮",
    },

    // ── Drinks ────────────────────────────────────────────────
    {
      id: "item_014",
      category_id: "cat_drinks",
      name_ar: "موهيتو فراولة",
      name_en: "Strawberry Mojito",
      description_ar: "فراولة طازجة، نعناع، ليمون، صودا",
      description_en: "Fresh strawberries, mint, lime & sparkling water",
      price: 22,
      image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🥤",
    },
    {
      id: "item_015",
      category_id: "cat_drinks",
      name_ar: "لاتيه عربي",
      name_en: "Arabic Latte",
      description_ar: "إسبريسو مزدوج مع حليب مبخر وهيل",
      description_en: "Double espresso, steamed milk & cardamom",
      price: 19,
      image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80",
      badge: "",
      available: true,
      emoji: "☕",
    },
    {
      id: "item_016",
      category_id: "cat_drinks",
      name_ar: "عصير مانجو طازج",
      name_en: "Fresh Mango Juice",
      description_ar: "مانجو طازج معصور لحظياً بدون إضافات",
      description_en: "Freshly pressed mango, no additives",
      price: 18,
      image_url: "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      badge: "",
      available: true,
      emoji: "🥭",
    },
  ];
}

export function getMockItemById(id: string): MenuItemDTO | undefined {
  return getMockItems().find((item) => item.id === id);
}

export function getMockItemsByCategory(categoryId: string): MenuItemDTO[] {
  return getMockItems().filter((item) => item.category_id === categoryId);
}

// ─────────────────────────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────────────────────────

/** Wrap any payload in the standard API envelope */
export function ok<T>(data: T): ApiEnvelope<T> {
  return {
    data,
    timestamp: new Date().toISOString(),
    next_cursor: null,
  };
}

/** Build a structured error body */
export function err(
  code: string,
  message: string,
  message_ar?: string,
  details?: unknown,
): ApiError {
  return { code, message, message_ar, details };
}
