"use client";

// =============================================================
// hooks/useDashboardData.ts
//
// Fetches real dashboard analytics from GET /api/dashboard.
// Refreshes every 30 seconds automatically (live orders KPI).
// Falls back to context data (mock/demo) when the API returns
// an error or the user is in trial mode.
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/lib/context";
import type { DashboardData } from "@/app/api/dashboard/route";

export type { DashboardData };

export interface UseDashboardDataReturn {
  data:        DashboardData | null;
  isLoading:   boolean;
  error:       string | null;
  refetch:     () => void;
  lastUpdated: Date | null;
}

// How often to auto-refresh (ms) — 30 seconds keeps active KPI live
const REFRESH_INTERVAL = 30_000;

export function useDashboardData(): UseDashboardDataReturn {
  const { state } = useApp();

  const [data,        setData]        = useState<DashboardData | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tick,        setTick]        = useState(0);  // increment to force refetch

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Don't fetch until session is hydrated with a role
    if (!state.auth?.role) return;

    // Only roles with dashboard:read can fetch (matches API RBAC)
    const noAccessRoles = ["kitchen", "waiter"];
    if (noAccessRoles.includes(state.auth.role)) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard", { signal: ctrl.signal });

      if (ctrl.signal.aborted) return;

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(json.message ?? `HTTP ${res.status}`);
      }

      const json = await res.json() as { data: DashboardData };
      if (!ctrl.signal.aborted) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useDashboardData]", msg);
      setError(msg);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [state.auth?.role, tick]);

  // Fetch on mount and when deps change
  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  // Auto-refresh every 30s for the live "active orders" KPI
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  return { data, isLoading, error, refetch, lastUpdated };
}
