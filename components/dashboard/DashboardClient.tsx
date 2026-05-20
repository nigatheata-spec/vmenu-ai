"use client";

import { useEffect, useRef } from "react";
import { useApp }             from "@/lib/context";
import AppShell               from "@/components/layout/AppShell";
import { AuthSync }           from "@/hooks/useAuthSync";
import type { AuthSession }   from "@/types/supabase";
import type { AuthUser }      from "@/types";
import { Flask, X }           from "@phosphor-icons/react";

interface DashboardClientProps {
  session: AuthSession;
  isTrial?: boolean;
}

function sessionToAuthUser(s: AuthSession): AuthUser {
  return {
    name:    s.name,
    email:   s.email,
    resto:   s.venueName,
    slug:    s.venueSlug,
    tables:  10,
    city:    "",
    phone:   "",
    initial: s.initial,
    role:    s.role,
  };
}

function TrialBanner() {
  const endTrial = async () => {
    await fetch("/api/auth/demo", { method: "DELETE" });
    window.location.href = "/";
  };
  return (
    <div className="fixed top-0 start-0 end-0 z-[999] flex items-center justify-between gap-3 px-4 py-2 text-sm font-semibold"
      style={{ background: "linear-gradient(135deg, var(--ac), var(--ac2))", color: "#000" }}>
      <div className="flex items-center gap-2">
        <Flask size={14} weight="duotone" />
        <span>أنت تستخدم النسخة التجريبية — البيانات وهمية ولن تُحفظ</span>
      </div>
      <div className="flex items-center gap-2">
        <a href="/signup" className="px-3 py-1 rounded-full text-xs font-bold bg-black text-[var(--ac)] hover:opacity-80">
          إنشاء حساب مجاني
        </a>
        <button onClick={endTrial} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-black/30 hover:bg-black/10">
          <X size={10} weight="bold" /> إنهاء التجربة
        </button>
      </div>
    </div>
  );
}

export default function DashboardClient({ session, isTrial = false }: DashboardClientProps) {
  const { state, dispatch } = useApp();

  // mountId changes every time this component is mounted from scratch.
  // When the user navigates away and back, Next.js unmounts and remounts
  // this component — mountId gets a new value → effect always re-fires
  // → SET_AUTH always dispatches → spinner always resolves.
  //
  // Previous approach used [session.userId, session.role] as deps.
  // Problem: if the same user navigates away then back, those values
  // are IDENTICAL between the old mount and the new mount, so React
  // skips the effect → state.auth stays null → spinner forever.
  //
  // Using a ref value that increments on mount guarantees the effect
  // runs exactly once per component lifetime regardless of prop values.
  const mountIdRef = useRef(0);
  useEffect(() => {
    mountIdRef.current += 1;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    dispatch({ type: "SET_AUTH", payload: sessionToAuthUser(session) });
  // mountIdRef.current changes every mount → this effect re-runs every mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountIdRef.current]);

  // Show spinner ONLY during the synchronous gap before SET_AUTH fires.
  // After the effect runs (next microtask), state.auth.role is set and
  // this guard never activates again for this mount.
  if (!state.auth?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--b0)]">
        <span className="w-8 h-8 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isTrial && <TrialBanner />}
      <div style={isTrial ? { paddingTop: "40px" } : undefined}>
        {!isTrial && <AuthSync />}
        <AppShell isTrial={isTrial} />
      </div>
    </>
  );
}
