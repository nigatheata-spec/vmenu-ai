"use client";

// =============================================================
// hooks/useOrdersData.ts
//
// Fetches live orders from GET /api/orders with 15s auto-refresh.
//
// KEY FIX: The previous version used `state.auth?.role` as a
// guard — if it was null (before DashboardClient dispatches
// SET_AUTH), the fetch would return early and never retry.
// The 15s interval would fire later but the user would see
// mock/empty data until then.
//
// New approach: the hook retries on every tick AND whenever
// state.auth.role becomes available. This guarantees the first
// real fetch happens as soon as the session is hydrated.
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/lib/context";

// ── Wire types (match API response exactly) ───────────────────
export interface APIOrderItem {
  id:          string;
  menu_item_id: string;
  name_ar:     string;
  name_en:     string;
  emoji:       string;
  quantity:    number;
  price:       number;
  subtotal:    number;
}

export type DBStatus  = "new" | "prep" | "ready" | "served" | "cancelled";
export type APIStatus = "received" | "preparing" | "ready" | "delivered" | "cancelled";

export interface APIOrder {
  id:           string;
  table_id:     string | null;
  table_number: number | null;
  status:       APIStatus;
  status_raw:   DBStatus;
  total_price:  number;
  notes:        string | null;
  items:        APIOrderItem[];
  created_at:   string;
  updated_at:   string;
}

export interface UseOrdersDataReturn {
  orders:       APIOrder[];
  isLoading:    boolean;
  error:        string | null;
  refetch:      () => void;
  updateStatus: (orderId: string, newStatus: string) => Promise<boolean>;
}

const REFRESH_MS = 15_000;

// Map API status names → DB status names for optimistic updates
const API_TO_DB_MAP: Record<string, DBStatus> = {
  received:  "new",
  preparing: "prep",
  ready:     "ready",
  delivered: "served",
  cancelled: "cancelled",
  // also accept raw DB values directly
  new: "new", prep: "prep", served: "served",
};

export function useOrdersData(statusFilter?: string): UseOrdersDataReturn {
  const { state } = useApp();
  const [orders,    setOrders]    = useState<APIOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);
  const abortRef  = useRef<AbortController | null>(null);
  const loadedRef = useRef(false); // tracks whether first successful load happened

  const fetchOrders = useCallback(async () => {
    // Wait until session is hydrated — but don't block forever:
    // if role is missing we still try (the API will 401 and we show an error)
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "200" });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/orders?${params}`, {
        signal: ctrl.signal,
        // Prevent browser from serving a cached response —
        // orders are live data, must always go to the server
        cache: "no-store",
      });

      if (ctrl.signal.aborted) return;

      if (res.status === 401) {
        // Not authenticated yet — will retry when role is set
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { message?: string; code?: string };
        throw new Error(j.message ?? `Server error ${res.status}`);
      }

      const json = await res.json() as { data: APIOrder[] };

      if (!ctrl.signal.aborted) {
        setOrders(json.data ?? []);
        setError(null);
        loadedRef.current = true;
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useOrdersData]", msg);
      setError(msg);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [statusFilter, tick]);

  // Fetch whenever fetchOrders changes (tick increment or statusFilter change)
  useEffect(() => {
    fetchOrders();
    return () => abortRef.current?.abort();
  }, [fetchOrders]);

  // Re-fetch when auth role becomes available (session hydration)
  // This handles the case where the hook mounts before SET_AUTH fires
  const prevRoleRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const role = state.auth?.role;
    if (role && role !== prevRoleRef.current) {
      prevRoleRef.current = role;
      if (!loadedRef.current) {
        // First time we have a role and haven't loaded yet → fetch immediately
        setTick(n => n + 1);
      }
    }
  }, [state.auth?.role]);

  // Auto-refresh every 15s for live order updates
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const updateStatus = useCallback(async (orderId: string, newStatus: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { message?: string };
        console.error("[updateStatus]", j.message);
        return false;
      }
      // Optimistic update — immediately reflect change in UI
      const dbStatus = API_TO_DB_MAP[newStatus] ?? (newStatus as DBStatus);
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status_raw: dbStatus } : o
      ));
      return true;
    } catch (err) {
      console.error("[updateStatus]", err);
      return false;
    }
  }, []);

  return {
    orders,
    isLoading,
    error,
    refetch: () => setTick(n => n + 1),
    updateStatus,
  };
}
