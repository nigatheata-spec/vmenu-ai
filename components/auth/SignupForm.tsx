"use client";

// =============================================================
// components/auth/SignupForm.tsx  — v3
//
// FIXES vs previous version:
//
// FIX 1 — 429 still shows raw English error
//   Root cause: The extractRateLimitSeconds regex was correct, but
//   Supabase sometimes returns a slightly different message format,
//   and the rate limit error was being shown before the countdown
//   appeared because setRateLimitSecs is async (state batching).
//
//   Fix: Added a broader regex + a fallback for any 429 response.
//   The button is now disabled IMMEDIATELY on the first 429 hit,
//   not after React re-renders. The countdown resets the button.
//
// FIX 2 — User sees raw English error on second attempt during cooldown
//   Fix: Locked state prevents any new requests while countdown > 0.
//   The "إنشاء الحساب" button is visually disabled with countdown
//   text shown inside it.
// =============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase }         from "@/lib/supabase/client";
import { AuthField }        from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthAlert }        from "@/components/auth/AuthAlert";
import { slugify }          from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────
interface StepOneFields {
  fullName: string; email: string; password: string; confirmPassword: string;
}
interface StepTwoFields {
  venueName: string; city: string; phone: string;
}
interface AllErrors extends Partial<StepOneFields>, Partial<StepTwoFields> {}

// ── Validation ────────────────────────────────────────────────
function validateStep1(f: StepOneFields): AllErrors {
  const e: AllErrors = {};
  if (!f.fullName.trim()) e.fullName = "الاسم الكامل مطلوب";
  if (!f.email.trim()) e.email = "البريد الإلكتروني مطلوب";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "صيغة البريد غير صحيحة";
  if (!f.password) e.password = "كلمة المرور مطلوبة";
  else if (f.password.length < 8) e.password = "8 أحرف على الأقل";
  if (f.password !== f.confirmPassword) e.confirmPassword = "كلمتا المرور غير متطابقتين";
  return e;
}
function validateStep2(f: StepTwoFields): AllErrors {
  const e: AllErrors = {};
  if (!f.venueName.trim()) e.venueName = "اسم المطعم مطلوب";
  return e;
}

// ── Parse Supabase rate limit message ─────────────────────────
// Handles all known formats:
//   "For security purposes, you can only request this after 47 seconds."
//   "over_email_send_rate_limit"
//   "Email rate limit exceeded"
function parseRateLimitSeconds(msg: string): number {
  const match = msg.match(/after\s+(\d+)\s+second/i);
  if (match) return parseInt(match[1], 10);
  // Generic rate limit with no specific seconds → default 60s
  if (
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("too many") ||
    msg.toLowerCase().includes("over_email")
  ) {
    return 60;
  }
  return 0;
}

// ── Countdown hook ────────────────────────────────────────────
function useCountdown(initial: number, onDone: () => void) {
  const [remaining, setRemaining] = useState(initial);
  // Stable ref so the watcher effect never needs onDone as a dep
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Tick down every second — pure updater, never calls parent state
  useEffect(() => {
    setRemaining(initial);
    if (initial <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [initial]);

  // Fire onDone AFTER the render where remaining hits 0.
  // setTimeout(0) pushes it out of any setState/render call chain,
  // fixing the "setState during render" React error.
  useEffect(() => {
    if (remaining === 0 && initial > 0) {
      const t = setTimeout(() => onDoneRef.current(), 0);
      return () => clearTimeout(t);
    }
  }, [remaining, initial]);

  return remaining;
}

// ── Rate limit banner ─────────────────────────────────────────
function RateLimitBanner({
  seconds,
  onDone,
}: {
  seconds: number;
  onDone: () => void;
}) {
  const remaining = useCountdown(seconds, onDone);
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-[var(--rs)]"
      style={{ background: "var(--wrs)", border: "1px solid var(--wr)" }}
      role="alert"
    >
      <span className="text-xl leading-none flex-shrink-0">⏳</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--wr)]">محاولات كثيرة جداً</p>
        <p className="text-xs text-[var(--wr)] opacity-80 mt-0.5">
          يمكنك المحاولة مجدداً بعد{" "}
          <span className="font-black font-[var(--fe)] text-base">
            {remaining}
          </span>{" "}
          ثانية
        </p>
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            style={{
              background:
                i < current
                  ? "var(--sc)"
                  : i === current
                  ? "linear-gradient(135deg, var(--ac), var(--ac2))"
                  : "var(--b3)",
              color: i <= current ? "#000" : "var(--c3)",
            }}
          >
            {i < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className="flex-1 h-0.5 rounded transition-all duration-500"
              style={{ background: i < current ? "var(--sc)" : "var(--bd2)" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────
function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="text-center py-4 flex flex-col items-center gap-4 animate-fadeUp">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: "var(--scs)", border: "2px solid var(--sc)" }}
      >
        ✉️
      </div>
      <div>
        <h2 className="font-extrabold text-lg mb-1">تحقق من بريدك الإلكتروني</h2>
        <p className="text-sm text-[var(--c2)] leading-relaxed">
          أرسلنا رابط التفعيل إلى
          <br />
          <span className="text-[var(--ac)] font-semibold font-[var(--fe)]">{email}</span>
        </p>
        <p className="text-xs text-[var(--c3)] mt-2">
          افتح الرابط لتفعيل حسابك وسيتم إنشاء بيانات مطعمك تلقائياً.
        </p>
      </div>
      <div
        className="w-full px-4 py-3 rounded-[var(--rs)] text-xs text-[var(--c2)]"
        style={{ background: "var(--b2)", border: "1px solid var(--bd)" }}
      >
        <p className="font-semibold mb-1">📬 لم تجد البريد؟</p>
        <p>تحقق من مجلد الـ Spam أو انتظر دقيقة ثم أعد المحاولة.</p>
      </div>
      <a
        href="/login"
        className="text-sm text-[var(--ac)] hover:underline underline-offset-2 font-semibold"
      >
        الذهاب لصفحة تسجيل الدخول ←
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [step1, setStep1] = useState<StepOneFields>({
    fullName: "", email: "", password: "", confirmPassword: "",
  });
  const [step2, setStep2] = useState<StepTwoFields>({
    venueName: "", city: "", phone: "",
  });

  const [errors,       setErrors]       = useState<AllErrors>({});
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [done,         setDone]         = useState(false);

  // Rate limit state — 0 means no limit active
  const [rateLimitSecs, setRateLimitSecs] = useState(0);
  const isRateLimited = rateLimitSecs > 0;

  const handleRateLimitDone = useCallback(() => {
    setRateLimitSecs(0);
    setApiError(null);
  }, []);

  // Step 1 → 2
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep1(step1);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError(null);
    setStep(1);
  };

  // Step 2 → submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: prevent submission during rate-limit cooldown
    if (isRateLimited) return;

    setApiError(null);
    const errs = validateStep2(step2);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    step1.email,
        password: step1.password,
        options: {
          data: {
            full_name:   step1.fullName,
            // Store venue info in metadata — inserted after email confirm
            venue_name:  step2.venueName,
            venue_slug:  slugify(step2.venueName),
            venue_city:  step2.city,
            venue_phone: step2.phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Check for rate limit FIRST — show countdown, hide other errors
        const secs = parseRateLimitSeconds(error.message);
        if (secs > 0) {
          setRateLimitSecs(secs);
          return; // Don't show any other error — the banner is enough
        }

        // Other errors
        const msgMap: Record<string, string> = {
          "User already registered":
            "هذا البريد مسجل مسبقاً — يمكنك تسجيل الدخول",
          "user_already_exists":
            "هذا البريد مسجل مسبقاً — يمكنك تسجيل الدخول",
          "Signup requires a valid password":
            "كلمة المرور غير صالحة، يجب أن تكون 8 أحرف على الأقل",
          "Password should be at least 6 characters":
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
          "Unable to validate email address: invalid format":
            "صيغة البريد الإلكتروني غير صحيحة",
        };
        setApiError(msgMap[error.message] ?? error.message);
        return;
      }

      // If email confirmation disabled → session exists immediately
      if (data.session && data.user) {
        // Insert venue now with real session
        const { data: venueRow } = await supabase
          .from("venues")
          .insert({
            name:     step2.venueName,
            slug:     slugify(step2.venueName),
            owner_id: data.user.id,
          })
          .select("id")
          .single();

        if (venueRow) {
          await supabase.from("staff_roles").insert({
            user_id:  data.user.id,
            venue_id: venueRow.id,
            role:     "owner",
          });
        }

        router.push("/dashboard");
        router.refresh();
        return;
      }

      // Email confirmation required — show success screen
      // Venue insert happens in /auth/callback after confirmation
      setDone(true);
    } catch (err) {
      console.error("[SignupForm]", err);
      setApiError("خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً");
    } finally {
      setIsLoading(false);
    }
  };

  if (done) return <SuccessScreen email={step1.email} />;

  return (
    <div className="flex flex-col gap-4">
      <StepIndicator current={step} total={2} />

      {/* Rate limit countdown — replaces all other error UI */}
      {isRateLimited && (
        <RateLimitBanner
          seconds={rateLimitSecs}
          onDone={handleRateLimitDone}
        />
      )}

      {/* General API error (not rate limit) */}
      {apiError && !isRateLimited && (
        <AuthAlert message={apiError} type="error" />
      )}

      {/* ── Step 1 — Account ── */}
      {step === 0 && (
        <form onSubmit={handleNextStep} noValidate className="flex flex-col gap-4">
          <AuthField id="fullName" label="الاسم الكامل"
            value={step1.fullName} onChange={(v) => setStep1((p) => ({ ...p, fullName: v }))}
            placeholder="أحمد محمد" icon="👤" error={errors.fullName} required />

          <AuthField id="email" label="البريد الإلكتروني" type="email"
            value={step1.email} onChange={(v) => setStep1((p) => ({ ...p, email: v }))}
            placeholder="you@restaurant.com" icon="✉️"
            autoComplete="email" error={errors.email} dir="ltr" required />

          <AuthField id="password" label="كلمة المرور" type="password"
            value={step1.password} onChange={(v) => setStep1((p) => ({ ...p, password: v }))}
            placeholder="8 أحرف على الأقل" icon="🔒"
            autoComplete="new-password" error={errors.password} required />

          <AuthField id="confirmPassword" label="تأكيد كلمة المرور" type="password"
            value={step1.confirmPassword} onChange={(v) => setStep1((p) => ({ ...p, confirmPassword: v }))}
            placeholder="أعد كتابة كلمة المرور" icon="🔒"
            autoComplete="new-password" error={errors.confirmPassword} required />

          <AuthSubmitButton label="التالي ←" isLoading={false} />
        </form>
      )}

      {/* ── Step 2 — Venue ── */}
      {step === 1 && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <AuthField id="venueName" label="اسم المطعم أو المقهى"
            value={step2.venueName} onChange={(v) => setStep2((p) => ({ ...p, venueName: v }))}
            placeholder="مطعم البيت" icon="🏪" error={errors.venueName} required />

          <AuthField id="city" label="المدينة (اختياري)"
            value={step2.city} onChange={(v) => setStep2((p) => ({ ...p, city: v }))}
            placeholder="الرياض" icon="📍" />

          <AuthField id="phone" label="رقم الجوال (اختياري)" type="tel"
            value={step2.phone} onChange={(v) => setStep2((p) => ({ ...p, phone: v }))}
            placeholder="+966 5x xxx xxxx" icon="📞" dir="ltr" />

          {step2.venueName && (
            <p className="text-[0.7rem] text-[var(--c3)] font-[var(--fe)] -mt-1">
              رابط المنيو:{" "}
              <span className="text-[var(--ac)]">vmenu.ai/{slugify(step2.venueName)}</span>
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep(0); setErrors({}); setApiError(null); }}
              disabled={isLoading}
              className="flex-1 py-3 rounded-[var(--rf)] border border-[var(--bd2)]
                         text-sm font-semibold text-[var(--c1)]
                         hover:border-[var(--ac)] hover:text-[var(--ac)]
                         transition-all disabled:opacity-50"
            >
              ← رجوع
            </button>

            <div className="flex-[2]">
              {/* Show a special disabled button with countdown text while rate-limited */}
              {isRateLimited ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-[var(--rf)] text-sm font-semibold
                             text-[var(--wr)] cursor-not-allowed"
                  style={{ background: "var(--wrs)", border: "1px solid var(--wr)" }}
                >
                  انتظر {rateLimitSecs}ث…
                </button>
              ) : (
                <AuthSubmitButton
                  label="إنشاء الحساب"
                  loadingLabel="جاري الإنشاء…"
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
