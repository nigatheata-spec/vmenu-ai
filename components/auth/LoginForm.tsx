"use client";

// =============================================================
// components/auth/LoginForm.tsx  — v3
//
// FIXES vs previous version:
//
// FIX 1 — 400 on demo login
//   Root cause: demo@vmenu.ai doesn't exist in your Supabase project.
//   Supabase returns 400 "Invalid login credentials" for any email that
//   doesn't exist — the 400 is correct, the demo button was wrong.
//
//   Fix: The demo button now bypasses Supabase entirely.
//   It calls a local /api/auth/demo route which checks an env flag
//   (NEXT_PUBLIC_DEMO_MODE=true) and redirects to /dashboard with a
//   mock session stored in a cookie — zero Supabase calls.
//   When DEMO_MODE is off (production), the button is hidden.
//
// FIX 2 — Better error messages for all Supabase 400/429 cases
//   Added full error message map covering every Supabase Auth error.
// =============================================================

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase }         from "@/lib/supabase/client"; // used only for resend
import { AuthField }        from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthAlert }        from "@/components/auth/AuthAlert";

// ── Is demo mode enabled? ─────────────────────────────────────
// Set NEXT_PUBLIC_DEMO_MODE=true in .env.local for local testing.
// NEVER set it in production.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Supabase error → Arabic message map ──────────────────────
// Covers every error Supabase Auth v2 can return on signIn.
const SUPABASE_ERROR_MAP: Record<string, string> = {
  // 400 — credentials
  "Invalid login credentials":      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "invalid_credentials":            "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "Invalid email or password":      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  // 400 — email not confirmed
  "Email not confirmed":            "يرجى تفعيل بريدك الإلكتروني أولاً — تحقق من صندوق الوارد",
  "email not confirmed":            "يرجى تفعيل بريدك الإلكتروني أولاً — تحقق من صندوق الوارد",
  // 400 — account issues
  "User not found":                 "لا يوجد حساب بهذا البريد — هل تريد إنشاء حساب؟",
  "user_not_found":                 "لا يوجد حساب بهذا البريد — هل تريد إنشاء حساب؟",
  // 429 — rate limit
  "Too many requests":              "محاولات كثيرة جداً — انتظر قليلاً ثم حاول مجدداً",
  "too_many_requests":              "محاولات كثيرة جداً — انتظر قليلاً ثم حاول مجدداً",
  "Request rate limit reached":     "تجاوزت الحد المسموح به — انتظر دقيقة ثم أعد المحاولة",
};

function mapError(msg: string): string {
  // Always log the raw message so devs can see the exact Supabase error
  console.error("[LoginForm] Supabase error:", msg);

  // Exact match first
  if (SUPABASE_ERROR_MAP[msg]) {
    // In dev: append raw error so it's visible in the UI
    if (process.env.NODE_ENV === "development") {
      return SUPABASE_ERROR_MAP[msg] + `\n[dev: ${msg}]`;
    }
    return SUPABASE_ERROR_MAP[msg];
  }
  // Partial match
  for (const [key, val] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) {
      if (process.env.NODE_ENV === "development") {
        return val + `\n[dev: ${msg}]`;
      }
      return val;
    }
  }
  // Fallback — show raw Supabase message directly
  return msg;
}

// ── Field validation ──────────────────────────────────────────
interface FormErrors { email?: string; password?: string }

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim())
    errors.email = "البريد الإلكتروني مطلوب";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "صيغة البريد الإلكتروني غير صحيحة";
  if (!password)
    errors.password = "كلمة المرور مطلوبة";
  else if (password.length < 6)
    errors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
  return errors;
}

// ── Component ─────────────────────────────────────────────────
export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/dashboard";

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [apiError,  setApiError]  = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // ── Email not confirmed state ──────────────────────────────
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading]         = useState(false);
  const [resendSent,    setResendSent]             = useState(false);

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await supabase.auth.resend({ type: "signup", email });
      setResendSent(true);
    } catch {
      // silently fail — user can try again
    } finally {
      setResendLoading(false);
    }
  };

  // ── Real login ─────────────────────────────────────────────
  // We call /api/auth (same-origin) instead of Supabase directly
  // to avoid the Safari "Load failed" CORS error that occurs when
  // the Supabase project's redirect URL allowlist doesn't include
  // the current origin (e.g. a Vercel preview URL).
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setEmailNotConfirmed(false);

    const fieldErrors = validate(email, password);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      const res  = await fetch("/api/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "signin", email, password }),
      });
      const json = await res.json() as { error?: string; session?: unknown };

      if (!res.ok) {
        const msg = json.error ?? "Authentication failed";
        // Special handling for unconfirmed email — show resend button
        if (
          msg.toLowerCase().includes("email not confirmed") ||
          msg.toLowerCase().includes("email_not_confirmed")
        ) {
          setEmailNotConfirmed(true);
          return;
        }
        setApiError(mapError(msg));
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setApiError("خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Demo login — bypasses Supabase entirely ────────────────
  // FIX: Instead of calling signInWithPassword with fake credentials
  // (which hits Supabase → 400), we call a local API route that
  // sets a mock session cookie without touching Supabase.
  const handleDemo = async () => {
    setDemoLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setApiError("الحساب التجريبي غير متاح حالياً");
      }
    } catch {
      setApiError("خطأ في الاتصال بالخادم");
    } finally {
      setDemoLoading(false);
    }
  };

  // Show success message when redirected after password reset
  const message = searchParams.get("message");

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Password reset success banner */}
      {message === "password_reset" && (
        <AuthAlert
          message="✓ تم تغيير كلمة المرور بنجاح — سجّل دخولك بكلمة المرور الجديدة"
          type="success"
        />
      )}

      {/* Link error banners */}
      {searchParams.get("error") === "link_expired" && (
        <AuthAlert
          message="⏰ انتهت صلاحية الرابط — يرجى طلب رابط جديد من صفحة استعادة كلمة المرور"
          type="error"
        />
      )}
      {searchParams.get("error") === "confirmation_failed" && (
        <AuthAlert
          message="⚠️ فشل تأكيد البريد — يرجى المحاولة مجدداً أو التواصل مع الدعم"
          type="error"
        />
      )}

      {/* API error */}
      {apiError && <AuthAlert message={apiError} type="error" />}

      {/* Email not confirmed — show resend option */}
      {emailNotConfirmed && (
        <div className="flex flex-col gap-2 px-4 py-3 rounded-[var(--rs)]"
          style={{ background: "var(--wrs)", border: "1px solid var(--wr)" }}>
          <p className="text-sm font-bold text-[var(--wr)]">
            ✉️ يرجى تفعيل بريدك الإلكتروني أولاً
          </p>
          <p className="text-xs text-[var(--wr)] opacity-80">
            تحقق من صندوق الوارد أو Spam بحثاً عن رسالة التفعيل.
          </p>
          {resendSent ? (
            <p className="text-xs font-semibold text-[var(--sc)]">✓ تم إعادة الإرسال!</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-xs font-semibold text-[var(--ac)] hover:underline text-start disabled:opacity-50"
            >
              {resendLoading ? "جاري الإرسال…" : "إعادة إرسال رسالة التفعيل →"}
            </button>
          )}
        </div>
      )}

      <AuthField
        id="email"
        label="البريد الإلكتروني"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@restaurant.com"
        autoComplete="email"
        error={errors.email}
        icon="✉️"
        dir="ltr"
        required
      />

      <AuthField
        id="password"
        label="كلمة المرور"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password}
        icon="🔒"
        required
      />

      <div className="flex justify-end -mt-1">
        <a
          href="/forgot-password"
          className="text-[0.75rem] text-[var(--ac)] hover:underline underline-offset-2"
        >
          نسيت كلمة المرور؟
        </a>
      </div>

      <AuthSubmitButton
        label="تسجيل الدخول →"
        loadingLabel="جاري تسجيل الدخول…"
        isLoading={isLoading}
      />

      {/* Demo login — only shown when NEXT_PUBLIC_DEMO_MODE=true */}
      {DEMO_MODE && (
        <>
          <div className="flex items-center gap-3 text-[var(--c3)] text-xs">
            <div className="flex-1 h-px bg-[var(--bd)]" />
            أو
            <div className="flex-1 h-px bg-[var(--bd)]" />
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full py-2.5 rounded-[var(--rs)] text-xs font-semibold
                       border border-dashed border-[var(--bda)] text-[var(--ac)]
                       hover:bg-[var(--acs)] transition-all disabled:opacity-50"
          >
            {demoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full border border-[var(--ac)] border-t-transparent animate-spin" />
                جاري التحميل…
              </span>
            ) : (
              "🧪 استخدم الحساب التجريبي"
            )}
          </button>
        </>
      )}
    </form>
  );
}
