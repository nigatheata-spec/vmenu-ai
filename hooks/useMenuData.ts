"use client";

// =============================================================
// hooks/useMenuData.ts
//
// Fetches real menu items + categories from Supabase via the
// API routes. Syncs results into AppContext so the entire app
// sees live data.
//
// Key changes vs original:
//   - Waits for state.auth to be set before fetching
//     (avoids 401 on first render before session is hydrated)
//   - Uses venueId + userId as effect deps so data refetches
//     when the user changes (e.g. staff member login after owner)
//   - Abort controller cancels in-flight requests on unmount
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp }         from "@/lib/context";
import { ApiClientError } from "@/lib/api/client";
import { toMenuItems, toCategories } from "@/lib/api/transformers";
import type { MenuItem, Category } from "@/types";
import type { MenuItemDTO, CategoryDTO } from "@/types/api";

export interface UseMenuDataReturn {
  items:         MenuItem[];
  categories:    Category[];
  isLoading:     boolean;
  error:         Error | null;
  refetch:       () => void;
  isInitialized: boolean;
}

export function useMenuData(): UseMenuDataReturn {
  const { state, dispatch } = useApp();

  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fetchCount,    setFetchCount]    = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // Stable identifiers from session — used as effect deps so
  // data refetches when the logged-in user changes.
  const userId  = state.auth?.email ?? "";  // unique per user
  const venueId = state.auth?.resto  ?? "";  // unique per venue

  const load = useCallback(async () => {
    // Don't fetch before session is hydrated — avoids 401 on first render
    if (!state.auth?.role) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch — items and categories
      const [itemsRes, catsRes] = await Promise.all([
        fetch("/api/menu/items",      { signal: controller.signal }),
        fetch("/api/menu/categories", { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      // Handle auth errors — session may have expired
      if (itemsRes.status === 401 || catsRes.status === 401) {
        throw new Error("Session expired — please log in again");
      }

      if (!itemsRes.ok || !catsRes.ok) {
        const errBody = await (itemsRes.ok ? catsRes : itemsRes).json().catch(() => ({}));
        throw new Error(errBody.message_ar ?? errBody.message ?? "Failed to load menu data");
      }

      const [itemsJson, catsJson] = await Promise.all([
        itemsRes.json() as Promise<{ data: MenuItemDTO[] }>,
        catsRes.json()  as Promise<{ data: CategoryDTO[] }>,
      ]);

      if (controller.signal.aborted) return;

      const items      = toMenuItems(itemsJson.data   ?? []);
      const categories = toCategories(catsJson.data ?? []);

      dispatch({ type: "SET_ITEMS",      payload: items });
      dispatch({ type: "SET_CATEGORIES", payload: categories });

      setIsInitialized(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [dispatch, userId, venueId, fetchCount]); // refetch when user/venue changes

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const refetch = useCallback(() => setFetchCount((n) => n + 1), []);

  return {
    items:         state.items,
    categories:    state.categories,
    isLoading,
    error,
    refetch,
    isInitialized,
  };
}

// ── Human-readable error message (bilingual) ─────────────────
export function formatApiError(err: Error, lang: "ar" | "en"): string {
  if (err instanceof ApiClientError) {
    if (lang === "ar" && (err.payload as any).message_ar) return (err.payload as any).message_ar;
    return err.payload.message;
  }
  return lang === "ar"
    ? "خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً"
    : "Failed to connect to server. Please try again.";
}
