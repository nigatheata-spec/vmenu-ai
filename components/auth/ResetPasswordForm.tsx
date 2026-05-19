"use client";

// =============================================================
// components/auth/ResetPasswordForm.tsx — final
//
// KEY FIX — "Password not updating / user not logged out":
//
// Problem: fetch("/api/auth/signout") returns a 303 redirect.
// The browser follows that redirect INSIDE the fetch call (silently).
// The Set-Cookie headers clearing the session are applied to the
// fetch's internal response — NOT to the browser's top-level cookie jar.
// So after fetch() resolves, the session cookie is still live in
// the browser. window.location.href then navigates to /login, but
// the middleware sees the valid cookie and redirects to /dashboard.
//
// Root fix: Use a real HTML form POST, not fetch().
// An HTML <form> submit is a TOP-LEVEL browser navigation — the
// browser applies the Set-Cookie headers from the 303 response
// directly to its cookie store, then follows the redirect to /login.
// The session cookie is provably gone before /login is rendered.
//
// We programmatically submit a hidden form instead of user interaction.
// =============================================================

import React, { useState, useEffect, useRef } from "react";
import { useRouter }        from "next/navigation";
import { supabase }         from "@/lib/supabase/client";
import { AuthField }        from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthAlert }        from "@/components/auth/AuthAlert";

type SessionState = "loading" | "ready" | "missing";

export function ResetPasswordForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);

  // Hidden form ref — used for the server-side signout POST
  const signoutFormRef = useRef<HTMLFormElement>(null);

  // ── Session detection ──────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") {
          setSessionState(session ? "ready" : "missing");
        }
        if (event === "PASSWORD_RECOVERY") {
          setSessionState("ready");
        }
      }
    );

    // Fallback: if INITIAL_SESSION never fires within 3s (rare), check manually
    const fallback = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionState(session ? "ready" : "missing");
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (sessionState === "missing") {
      router.replace("/forgot-password?error=no_session");
    }
  }, [sessionState, router]);

  // ── Form submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        const msgMap: Record<string, string> = {
          "New password should be different from the old password":
            "يجب أن تكون كلمة المرور الجديدة مختلفة عن القديمة",
          "Password should be at least 6 characters":
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        };
        setError(msgMap[err.message] ?? err.message);
        return;
      }

      setSuccess(true);

      // ── Sign out via hidden form POST (top-level navigation) ────
      //
      // WHY NOT fetch("/api/auth/signout")?
      // fetch() follows the 303 redirect internally. Set-Cookie headers
      // from that redirect update the fetch's internal cookie store,
      // NOT the browser's top-level cookie jar. After fetch resolves,
      // the session cookie is still live. window.location.href then
      // sends the live cookie to /login → middleware → /dashboard.
      //
      // WHY form.submit()?
      // An HTML form POST is a TOP-LEVEL browser navigation. The browser
      // processes the 303 Set-Cookie headers and applies them to its
      // actual cookie store before following the redirect. The session
      // cookie is truly gone when /login renders.
      setTimeout(() => {
        if (signoutFormRef.current) {
          signoutFormRef.current.submit();
        }
      }, 2000);

    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  if (sessionState === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="w-7 h-7 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
        <p className="text-sm text-[var(--c2)]">جاري التحقق من الرابط…</p>
      </div>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--c2)]">يتم تحويلك…</p>
      </div>
    );
  }

  if (success) {
    return (
      <>
        {/* Hidden signout form — submitted programmatically after 2s */}
        {/* method=POST → /api/auth/signout → 303 → /login?message=password_reset */}
        {/* This is a top-level navigation so Set-Cookie headers clear the session */}
        <form
          ref={signoutFormRef}
          method="POST"
          action="/api/auth/signout"
          style={{ display: "none" }}
        >
          <input type="hidden" name="redirectTo" value="/login?message=password_reset" />
        </form>

        <div className="text-center flex flex-col items-center gap-4 py-2 animate-fadeUp">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: "var(--scs)", border: "2px solid var(--sc)" }}>
            ✓
          </div>
          <div>
            <p className="font-bold text-base mb-1">تم تغيير كلمة المرور!</p>
            <p className="text-sm text-[var(--c2)]">جاري تحويلك لصفحة تسجيل الدخول…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && <AuthAlert message={error} type="error" />}

      <AuthField
        id="password"
        label="كلمة المرور الجديدة"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="8 أحرف على الأقل"
        autoComplete="new-password"
        icon="🔒"
        required
      />

      <AuthField
        id="confirm"
        label="تأكيد كلمة المرور"
        type="password"
        value={confirm}
        onChange={setConfirm}
        placeholder="أعد كتابة كلمة المرور"
        autoComplete="new-password"
        icon="🔒"
        required
      />

      <AuthSubmitButton
        label="تعيين كلمة المرور الجديدة"
        loadingLabel="جاري الحفظ…"
        isLoading={isLoading}
      />
    </form>
  );
}
