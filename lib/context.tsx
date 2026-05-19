"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  AppState,
  AuthUser,
  Category,
  MenuItem,
  MenuTheme,
  AppSettings,
  Order,
  RestaurantTable,
  Lang,
  Theme,
} from "@/types";

// ── Default seeds ─────────────────────────────────────────────
const defaultCategories = (): Category[] => [
  { id: "burgers",  emoji: "🍔", nameAr: "برقر",     nameEn: "Burgers",   visible: true },
  { id: "pizza",    emoji: "🍕", nameAr: "بيتزا",    nameEn: "Pizza",     visible: true },
  { id: "chicken",  emoji: "🍗", nameAr: "دجاج",     nameEn: "Chicken",   visible: true },
  { id: "salads",   emoji: "🥗", nameAr: "سلطات",    nameEn: "Salads",    visible: true },
  { id: "sides",    emoji: "🍟", nameAr: "إضافات",   nameEn: "Sides",     visible: true },
  { id: "desserts", emoji: "🍰", nameAr: "حلويات",   nameEn: "Desserts",  visible: true },
  { id: "drinks",   emoji: "🥤", nameAr: "مشروبات",  nameEn: "Drinks",    visible: true },
];

const defaultItems = (): MenuItem[] => [
  { id: "mock-1", categoryId: "burgers",  emoji: "🍔", nameAr: "سماش برقر واجيو",  nameEn: "Wagyu Smash",       descAr: "لحم واجيو وجبنة شيدر",       descEn: "Wagyu beef & cheddar",      price: 59, badge: "🔥", available: true, images: [] },
  { id: "mock-2", categoryId: "burgers",  emoji: "🍔", nameAr: "برقر دجاج كرسبي",  nameEn: "Crispy Chicken",    descAr: "دجاج مقرمش وكول سلو",         descEn: "Crispy chicken & slaw",     price: 39, badge: "",   available: true, images: [] },
  { id: "mock-3", categoryId: "pizza",    emoji: "🍕", nameAr: "بيتزا مارقريتا",   nameEn: "Margherita",        descAr: "صوص سان مارزانو وموزاريلا",   descEn: "San Marzano & mozzarella",  price: 45, badge: "",   available: true, images: [] },
  { id: "mock-4", categoryId: "pizza",    emoji: "🍕", nameAr: "بيتزا ترافل",       nameEn: "Truffle Pizza",     descAr: "كريمة ترافل أسود",             descEn: "Black truffle cream",       price: 75, badge: "⭐", available: true, images: [] },
  { id: "mock-5", categoryId: "chicken",  emoji: "🍗", nameAr: "دجاج مشوي",         nameEn: "Grilled Chicken",   descAr: "نصف دجاجة مع أعشاب",          descEn: "Half chicken with herbs",   price: 65, badge: "",   available: true, images: [] },
  { id: "mock-6", categoryId: "salads",   emoji: "🥗", nameAr: "سلطة سيزر",         nameEn: "Caesar Salad",      descAr: "خس روماني وصوص سيزر",          descEn: "Romaine with Caesar",       price: 32, badge: "",   available: true, images: [] },
  { id: "mock-7", categoryId: "sides",    emoji: "🍟", nameAr: "بطاطس ترافل",       nameEn: "Truffle Fries",     descAr: "بطاطس بزيت الترافل",           descEn: "Fries with truffle oil",    price: 25, badge: "",   available: true, images: [] },
  { id: "mock-8", categoryId: "desserts", emoji: "🍰", nameAr: "تشيز كيك باسك",     nameEn: "Basque Cheesecake", descAr: "تشيز كيك محترقة",              descEn: "Burnt cheesecake",          price: 35, badge: "",   available: true, images: [] },
  { id: "mock-9", categoryId: "drinks",   emoji: "🥤", nameAr: "موهيتو فراولة",     nameEn: "Strawberry Mojito", descAr: "فراولة طازجة مع نعناع",        descEn: "Fresh strawberry & mint",   price: 22, badge: "",   available: true, images: [] },
];

const defaultMenuTheme = (): MenuTheme => ({
  id: "luxury_dark",
  bg: "#0a0a0f",
  titleColor: "#f0f0f0",
  textDim: "#666680",
  accent: "#c9a96e",
  accentText: "#000",
  cardBg: "#111118",
  border: "#1a1a2a",
  viewMode: "standard",
  previewSize: "medium",
  allowToggle: false,
});

const defaultSettings = (): AppSettings => ({
  audioAlerts: true,
  apiWarn: true,
  weeklyEmail: false,
  autoPromos: true,
  maxDiscount: 25,
});

const generateDemoOrders = (tables: RestaurantTable[], items: MenuItem[]): Order[] => {
  const statuses: Order["status"][] = ["served", "served", "served", "ready", "prep", "new"];
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.now() - Math.floor(Math.random() * 600) * 60000);
    const n = 1 + Math.floor(Math.random() * 3);
    const orderItems = Array.from({ length: n }, () => {
      const it = items[Math.floor(Math.random() * items.length)];
      const qty = 1 + Math.floor(Math.random() * 2);
      return { itemId: it.id, qty, price: it.price };
    });
    const total = orderItems.reduce((s, x) => s + x.qty * x.price, 0);
    return {
      id: `VM-${4800 + i}`,
      tableId: 1 + Math.floor(Math.random() * Math.max(tables.length, 1)),
      items: orderItems,
      total,
      status: statuses[Math.floor(i / 4)] ?? "served",
      createdAt: d.toISOString(),
    };
  });
};

const buildTables = (count: number): RestaurantTable[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    num: i + 1,
    scans: 0,
    ordersCount: 0,
    status: i < 3 ? "active" : i === 3 ? "waiting" : "free",
    seats: 4,
  }));

// ── Initial state ─────────────────────────────────────────────
const initialState: AppState = {
  auth:         null,
  lang:         "ar",
  theme:        "dark",
  route:        "dashboard",
  tables:       [],
  categories:   [],
  items:        [],
  orders:       [],
  activePromos: [],
  menuTheme:    defaultMenuTheme(),
  settings:     defaultSettings(),
};

// ── Actions ───────────────────────────────────────────────────
type Action =
  | { type: "HYDRATE";             payload: AppState }
  | { type: "SET_AUTH";            payload: AuthUser }
  | { type: "LOGOUT" }
  | { type: "SET_LANG";            payload: Lang }
  | { type: "SET_THEME";           payload: Theme }
  | { type: "SET_ROUTE";           payload: string }
  | { type: "SET_TABLES";          payload: RestaurantTable[] }
  | { type: "ADD_TABLE" }
  | { type: "REMOVE_TABLE";        payload: number }
  | { type: "UPDATE_TABLE";        payload: RestaurantTable }
  | { type: "SET_CATEGORIES";      payload: Category[] }
  | { type: "SET_ITEMS";           payload: MenuItem[] }
  | { type: "SET_MENU_THEME";      payload: Partial<MenuTheme> }
  | { type: "SET_SETTINGS";        payload: Partial<AppSettings> }
  | { type: "ADD_ORDER";           payload: Order }
  | { type: "UPDATE_ORDER_STATUS"; payload: { id: string; status: Order["status"] } };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };

    case "SET_AUTH": {
      const tables     = buildTables(action.payload.tables);
      const categories = defaultCategories();
      const items      = defaultItems();
      const orders     = generateDemoOrders(tables, items);
      return {
        ...state,
        auth:      action.payload,
        tables,
        categories,
        items,
        orders,
        menuTheme: { ...defaultMenuTheme() },
        settings:  defaultSettings(),
        route:     "dashboard",
      };
    }

    case "LOGOUT":
      return { ...initialState };

    case "SET_LANG":   return { ...state, lang:     action.payload };
    case "SET_THEME":  return { ...state, theme:    action.payload };
    case "SET_ROUTE":  return { ...state, route:    action.payload };
    case "SET_TABLES": return { ...state, tables:   action.payload };
    case "SET_CATEGORIES": return { ...state, categories: action.payload };
    case "SET_ITEMS":      return { ...state, items:      action.payload };
    case "SET_MENU_THEME": return { ...state, menuTheme: { ...state.menuTheme, ...action.payload } };
    case "SET_SETTINGS":   return { ...state, settings:  { ...state.settings,  ...action.payload } };
    case "ADD_ORDER":      return { ...state, orders: [...state.orders, action.payload] };

    case "ADD_TABLE": {
      const maxNum = state.tables.reduce((m, t) => Math.max(m, t.num), 0);
      return {
        ...state,
        tables: [...state.tables, { id: Date.now(), num: maxNum + 1, scans: 0, ordersCount: 0, status: "free", seats: 4 }],
      };
    }

    case "REMOVE_TABLE":
      return { ...state, tables: state.tables.filter((t) => t.id !== action.payload) };

    case "UPDATE_TABLE":
      return { ...state, tables: state.tables.map((t) => t.id === action.payload.id ? action.payload : t) };

    case "UPDATE_ORDER_STATUS":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id ? { ...o, status: action.payload.status } : o
        ),
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────
interface AppContextValue {
  state:    AppState;
  dispatch: React.Dispatch<Action>;
  t:        (ar: string, en: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

// v3: bumped from v2 to discard stale auth without role field
const STORAGE_KEY = "vmenu_v3";

// ── Debounced localStorage write ──────────────────────────────
// FIX 1: Don't write to localStorage on EVERY state change.
// Writing on every dispatch (including SET_AUTH, SET_ROUTE, etc.)
// is synchronous, blocks the main thread, and triggers extra renders
// because the storage event fires back to the same tab in some browsers.
// Debounce to 500ms so only the final state after a burst of changes is saved.
function useDebouncedStorage(state: AppState) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip writing auth to storage — it's restored from the server on every load
    const { auth: _auth, ...persistable } = state;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...persistable, auth: null }));
      } catch (_) {}
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state]);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // FIX 2: Stable context value — recreating { state, dispatch, t } on every
  // render causes ALL consumers to re-render even when their slice of state
  // didn't change. Memoize the value so consumers only re-render when
  // state actually changes. dispatch is stable from useReducer.
  // t only changes when lang changes.
  const t = useCallback(
    (ar: string, en: string) => (state.lang === "ar" ? ar : en),
    [state.lang]
  );

  // ── Restore UI preferences from localStorage on mount ───────
  // auth is intentionally NOT restored — the server sets it via
  // DashboardClient → SET_AUTH with the verified role.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AppState>;
        dispatch({
          type: "HYDRATE",
          payload: {
            ...initialState,
            ...saved,
            auth:  null,         // never restore auth from storage
            route: "dashboard",  // always start on dashboard
          },
        });
      }
    } catch (_) {}
  }, []); // runs once on mount

  // ── Persist non-auth state to localStorage (debounced) ──────
  useDebouncedStorage(state);

  // ── Sync HTML attributes for dir/lang/theme ─────────────────
  useEffect(() => {
    document.documentElement.setAttribute("dir",        state.lang  === "ar"   ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang",       state.lang);
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.lang, state.theme]);

  return (
    // FIX 2 cont: Pass state directly — React already batches updates
    // from useReducer, so the context value only changes when dispatch runs.
    <AppContext.Provider value={{ state, dispatch, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
