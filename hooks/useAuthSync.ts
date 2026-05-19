"use client";

// =============================================================
// hooks/useAuthSync.ts — final
//
// Single responsibility: detect when the Supabase session ends
// in another browser tab and clear the local React state.
//
// It does NOT navigate — navigation is handled by AppShell's
// handleLogout which uses window.location.href for a hard reload.
// If this hook also called router.push, we'd get two competing
// navigations and the user could end up back on /dashboard.
//
// The middleware is the real session gate. If the user somehow
// stays on /dashboard with no session cookie, the next server
// request (page refresh, navigation) will be caught by middleware
// and redirected to /login. No client-side navigation needed here.
// =============================================================

import { useEffect, useRef } from "react";
import { supabase }          from "@/lib/supabase/client";
import { useApp }            from "@/lib/context";

export function useAuthSync() {
  const { dispatch } = useApp();

  // Tracks whether a real session was ever seen in this tab.
  // Prevents acting on SIGNED_OUT events that fire on mount
  // when there's no session (e.g. on /reset-password).
  const hadSessionRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          hadSessionRef.current = true;
          // No dispatch — DashboardClient owns the initial hydration.
          return;
        }

        // session === null
        if (event === "SIGNED_OUT" && hadSessionRef.current) {
          hadSessionRef.current = false;
          // Clear React state so if the user navigates back to /dashboard
          // within this tab, the spinner shows instead of stale data.
          dispatch({ type: "LOGOUT" });
          // Do NOT call router.push here — the session is already gone,
          // middleware will catch any protected route access.
          // AppShell's handleLogout handles explicit logout navigation.
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // stable — dispatch never changes
}

export function AuthSync() {
  useAuthSync();
  return null;
}
