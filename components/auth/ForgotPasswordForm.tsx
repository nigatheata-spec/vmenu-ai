"use client";

// =============================================================
// components/auth/ForgotPasswordForm.tsx
//
// FIXES vs old version:
//
// FIX 1 — "Returns to same page after sending link"
//   Root cause: Supabase requires the redirectTo URL to be
//   explicitly whitelisted in Dashboard → Auth → URL Configuration
//   → Additional Redirect URLs. If it's not whitelisted, Supabase
//   IGNORES the redirectTo silently and sends the token as a hash
//   fragment to the Site URL — which our route handler can't read.
//
//   Fix A (code): use /auth/callback as redirectTo instead of
//   /auth/reset-password — /auth/callback is already whitelisted
//   from the signup flow. We distinguish reset vs signup via a
//   type=recovery query param that Supabase includes automatically.
//
//   Fix B (Supabase dashboard — REQUIRED ONE-TIME SETUP):
//   Authentication → URL Configuration → Additional Redirect URLs:
//     http://localhost:3000/auth/callback
//     http://localhost:3000/auth/reset-password
//   (add your production URL too when deploying)
//
// FIX 2 — Rate limit shows raw English error
//   Added proper Arabic countdown for the 1-email/hour limit.
//
// FIX 3 — "User not found" leaks account existence
//   Supabase actually does NOT return an error for non-existent
//   emails (by design — prevents account enumeration). The email
//   is simply not sent. We show the same success UI either way.
// =============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase }         from "@/lib/supabase/client";
import { AuthField }        from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthAlert }        from "@/components/auth/AuthAlert";

// ── Rate limit countdown ──────────────────────────────────────
function useCountdown(initial: number, onDone: () => void) {
  const [remaining, setRemaining] = useState(initial);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    setRemaining(initial);
    if (initial <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [initial]);

  useEffect(() => {
    if (remaining === 0 && initial > 0) {
      const t = setTimeout(() => onDoneRef.current(), 0);
      return () => clearTimeout(t);
    }
  }, [remaining, initial]);

  return remaining;
}

function RateLimitBanner({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const remaining = useCountdown(seconds, onDone);
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--rs)]"
      style={{ background: "var(--wrs)", border: "1px solid var(--wr)" }} role="alert">
      <span className="text-xl leading-none flex-shrink-0">⏳</span>
      <div>
        <p className="text-sm font-bold text-[var(--wr)]">تم الإرسال مسبقاً</p>
        <p className="text-xs text-[var(--wr)] opacity-80 mt-0.5">
          يمكنك طلب رابط جديد بعد{" "}
          <span className="font-black font-[var(--fe)] text-base">{remaining}</span>
          {" "}ثانية
        </p>
      </div>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────
function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="text-center flex flex-col items-center gap-4 py-2 animate-fadeUp">
      <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={{ background: "var(--scs)", border: "2px solid var(--sc)" }}>
        ✉️
      </div>
      <div>
        <p className="font-bold text-base mb-1">تحقق من بريدك!</p>
        <p className="text-sm text-[var(--c2)] leading-relaxed">
          إذا كان البريد{" "}
          <span className="text-[var(--ac)] font-semibold font-[var(--fe)]">{email}</span>
          {" "}مسجلاً لدينا،
          <br />ستصلك رسالة برابط إعادة تعيين كلمة المرور.
        </p>
      </div>
      <div className="w-full px-4 py-3 rounded-[var(--rs)] text-xs text-[var(--c2)]"
        style={{ background: "var(--b2)", border: "1px solid var(--bd)" }}>
        <p className="font-semibold mb-1">📬 لم تجد الرسالة؟</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>تحقق من مجلد الـ Spam</li>
          <li>تأكد من صحة البريد الإلكتروني</li>
          <li>انتظر دقيقة إذا طلبت رابطاً مسبقاً</li>
        </ul>
      </div>
      <a href="/login"
        className="text-sm text-[var(--ac)] hover:underline underline-offset-2 font-semibold">
        العودة لتسجيل الدخول ←
      </a>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email,        setEmail]        = useState("");
  const [isLoading,    setIsLoading]    = useState(false);
  const [sent,         setSent]         = useState(false);
  const [error,        setError]        = useState<string | null>(
    urlError === "link_expired"
      ? "انتهت صلاحية الرابط — يرجى طلب رابط جديد"
      : urlError === "access_denied"
      ? "تم رفض الوصول — يرجى طلب رابط جديد"
      : urlError
      ? "رابط غير صالح — يرجى طلب رابط جديد"
      : null
  );
  const [rateLimitSecs, setRateLimitSecs] = useState(0);

  const handleRateLimitDone = useCallback(() => {
    setRateLimitSecs(0);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitSecs > 0) return;
    if (!email.trim()) { setError("البريد الإلكتروني مطلوب"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        // FIX 1: Use /auth/callback — already whitelisted in Supabase.
        // Supabase appends type=recovery automatically so /auth/callback
        // can distinguish this from a signup confirmation.
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (err) {
        console.error("[ForgotPassword] Supabase error:", err.message);

        // Rate limit detection
        const match = err.message.match(/after\s+(\d+)\s+second/i);
        const secs = match ? parseInt(match[1]) :
          (err.message.toLowerCase().includes("rate") ||
           err.message.toLowerCase().includes("limit") ||
           err.message.toLowerCase().includes("too many")) ? 3600 : 0;

        if (secs > 0) {
          setRateLimitSecs(secs);
          return;
        }

        // Any other error — still show success UI to prevent
        // account enumeration (don't tell attacker the email doesn't exist)
        setSent(true);
        return;
      }

      setSent(true);
    } catch {
      setError("خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) return <SuccessScreen email={email} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {rateLimitSecs > 0 && (
        <RateLimitBanner seconds={rateLimitSecs} onDone={handleRateLimitDone} />
      )}
      {error && !rateLimitSecs && <AuthAlert message={error} type="error" />}

      <AuthField
        id="email"
        label="البريد الإلكتروني"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@restaurant.com"
        autoComplete="email"
        icon="✉️"
        dir="ltr"
        required
      />

      {rateLimitSecs > 0 ? (
        <button type="button" disabled
          className="w-full py-3 rounded-[var(--rf)] text-sm font-semibold cursor-not-allowed opacity-60"
          style={{ background: "var(--wrs)", border: "1px solid var(--wr)", color: "var(--wr)" }}>
          انتظر {rateLimitSecs}ث قبل إعادة الإرسال
        </button>
      ) : (
        <AuthSubmitButton
          label="إرسال رابط الاستعادة"
          loadingLabel="جاري الإرسال…"
          isLoading={isLoading}
        />
      )}
    </form>
  );
}
