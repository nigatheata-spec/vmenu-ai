"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";

const FEATURES = [
  { idx: "01", icon: "📱", ar: "منيو + QR",         en: "Menu + QR",        dAr: "رمز QR لكل طاولة. الزبون يطلب بدون موظف.",            dEn: "Per-table QR. Guests order without staff." },
  { idx: "02", icon: "📸", ar: "صور AI",              en: "AI Photos",        dAr: "صورة جوال تتحول إلى لقطة احترافية 4K بثوانٍ.",         dEn: "One phone shot becomes a 4K product image in seconds." },
  { idx: "03", icon: "🎬", ar: "محتوى الفيديو",      en: "Video Content",    dAr: "ريلز، UGC، فيديوهات ترويجية — كل شيء من المنصة.",     dEn: "Reels, UGC, promos. All from one place." },
  { idx: "04", icon: "🎨", ar: "محرر المنيو",         en: "Menu Editor",      dAr: "خمسة ثيمات، drag & drop، تحكم كامل بالتصميم.",         dEn: "Five themes, drag & drop, full visual control." },
  { idx: "05", icon: "📊", ar: "تحليلات لحظية",      en: "Live Analytics",   dAr: "KPIs في الوقت الفعلي وهندسة المنيو بذكاء.",            dEn: "Real-time KPIs and smart menu engineering." },
  { idx: "06", icon: "🤖", ar: "عروض AI",             en: "AI Promos",        dAr: "Claude يحلل مبيعاتك ويقترح عروضاً تزيد الأرباح.",      dEn: "Claude reads your sales, suggests winning promos." },
  { idx: "07", icon: "📦", ar: "إدارة الطلبات",      en: "Order Management", dAr: "طلبات الطاولات في الوقت الفعلي، تنبيه صوتي، تتبع حالة.", dEn: "Live table orders, alert sounds, status tracking." },
] as const;

const STEPS = [
  { num: "1", ar: "سجّل مطعمك",       en: "Register",    dAr: "30 ثانية فقط",            dEn: "30 seconds." },
  { num: "2", ar: "صمّم المنيو",        en: "Design Menu", dAr: "ثيم + drag & drop + صور", dEn: "Theme + drag & drop + AI photos." },
  { num: "3", ar: "ضع QR على الطاولة", en: "Place QR",    dAr: "الزبون يمسح ويطلب",       dEn: "Guests scan and order." },
  { num: "4", ar: "انطلق",             en: "Launch",      dAr: "عروض + تحليلات تلقائية",  dEn: "Promos and analytics, automatic." },
] as const;

export default function Landing() {
  const { state, dispatch, t } = useApp();
  const router = useRouter();
  const [trialLoading, setTrialLoading] = useState(false);
  const isAr = state.lang === "ar";

  const startTrial = async () => {
    setTrialLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (res.ok) { router.push("/dashboard"); router.refresh(); }
    } finally { setTrialLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--b0)]" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 flex justify-between items-center px-6 h-14
                      bg-[var(--bg)] backdrop-blur-xl border-b border-[var(--bd)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--ac)] flex items-center justify-center
                          text-black font-black text-xs font-[var(--fe)]">
            V
          </div>
          <span className="font-black text-[0.95rem] font-[var(--fd)] tracking-tight">
            Vmenu<span className="text-[var(--ac)]">.ai</span>
          </span>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" })}
            className="w-8 h-8 rounded-md bg-[var(--b2)] border border-[var(--bd)]
                       flex items-center justify-center text-xs
                       hover:border-[var(--bd2)] transition-colors"
            aria-label="Toggle theme"
          >
            {state.theme === "dark" ? "☀️" : "🌙"}
          </button>

          <button
            onClick={() => dispatch({ type: "SET_LANG", payload: isAr ? "en" : "ar" })}
            className="px-2.5 h-8 rounded-md bg-[var(--b2)] border border-[var(--bd)]
                       text-[0.68rem] font-bold font-[var(--fe)]
                       hover:border-[var(--bd2)] transition-colors"
            aria-label="Toggle language"
          >
            {isAr ? "EN" : "عربي"}
          </button>

          <Link
            href="/login"
            className="px-4 h-8 rounded-md border border-[var(--bd2)] text-[var(--c2)]
                       text-[0.82rem] font-medium flex items-center
                       hover:border-[var(--ac)] hover:text-[var(--c0)] transition-colors"
          >
            {t("دخول", "Login")}
          </Link>

          <Link
            href="/signup"
            className="px-4 h-8 rounded-md bg-[var(--ac)] text-black text-[0.82rem] font-bold
                       flex items-center hover:opacity-90 active:scale-95 transition-all"
          >
            {t("ابدأ مجاناً", "Start Free")}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-[820px]">
          <p className="text-[0.7rem] font-bold font-[var(--fe)] text-[var(--ac)]
                        uppercase tracking-[0.15em] mb-7">
            {t("منصة إدارة المطاعم", "Restaurant Management Platform")}
          </p>

          <h1
            className="text-[clamp(2.4rem,6vw,4.5rem)] font-black leading-[1.05]
                       text-[var(--c0)] mb-6"
            style={{
              fontFamily: isAr ? "var(--fa)" : "var(--fd)",
              letterSpacing: isAr ? "normal" : "-0.03em",
            }}
          >
            {t("منيوك الرقمي", "Your restaurant,")}
            <br />
            {t("في 30 ثانية.", "digital in 30 seconds.")}
          </h1>

          <p className="text-[var(--c2)] text-base leading-relaxed max-w-[52ch] mb-10">
            {t(
              "QR للطلب، صور AI، عروض ذكية، تحليلات. سبع خدمات في منصة واحدة.",
              "QR ordering, AI photos, smart promos, analytics. Seven tools, one platform."
            )}
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/signup"
              className="px-7 py-3 rounded-lg bg-[var(--ac)] text-black font-bold text-sm
                         hover:opacity-90 active:scale-95 transition-all"
            >
              {t("ابدأ مجاناً ←", "Start Free →")}
            </Link>
            <button
              onClick={startTrial}
              disabled={trialLoading}
              className="px-7 py-3 rounded-lg border border-[var(--bd2)] text-[var(--c2)]
                         text-sm font-medium hover:border-[var(--ac)] hover:text-[var(--c0)]
                         transition-colors disabled:opacity-40"
            >
              {trialLoading ? t("جاري…", "Loading…") : t("جرّب مجاناً", "Free Trial")}
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-[var(--bd)] bg-[var(--b1)] px-6 py-16 lg:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:gap-24">

            <div className="lg:w-56 shrink-0 mb-12 lg:mb-0">
              <h2
                className="text-[1.5rem] font-black text-[var(--c0)] leading-snug mb-3"
                style={{ fontFamily: isAr ? "var(--fa)" : "var(--fd)" }}
              >
                {t("سبع خدمات،", "Seven tools,")}
                <br />
                {t("منصة واحدة.", "one platform.")}
              </h2>
              <p className="text-[0.82rem] text-[var(--c2)] leading-relaxed">
                {t(
                  "كل ما يحتاجه مطعمك، بدون تعقيد.",
                  "Everything your restaurant needs. Nothing it doesn't."
                )}
              </p>
            </div>

            <div className="flex-1 divide-y divide-[var(--bd)]">
              {FEATURES.map((f) => (
                <div key={f.idx} className="flex items-start gap-5 py-4">
                  <span className="text-[0.65rem] font-bold font-[var(--fe)] text-[var(--c3)]
                                   tabular-nums mt-0.5 w-5 shrink-0 select-none">
                    {f.idx}
                  </span>
                  <span className="text-base leading-none mt-0.5 shrink-0 select-none">
                    {f.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[0.87rem] text-[var(--c0)] mb-0.5">
                      {t(f.ar, f.en)}
                    </p>
                    <p className="text-[0.78rem] text-[var(--c2)] leading-relaxed">
                      {t(f.dAr, f.dEn)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="border-t border-[var(--bd)] px-6 py-16 lg:py-20 bg-[var(--b0)]">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[1.3rem] font-black text-[var(--c0)] mb-14"
            style={{ fontFamily: isAr ? "var(--fa)" : "var(--fd)" }}
          >
            {t("كيف تبدأ؟", "How it works.")}
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-4 h-px bg-[var(--bd2)]"
                    style={{ insetInlineStart: "calc(50% + 20px)", insetInlineEnd: 0 }}
                  />
                )}
                <div className="flex flex-col lg:items-center lg:text-center lg:px-4">
                  <div
                    className="w-8 h-8 rounded-full border-[1.5px] border-[var(--ac)]
                                text-[var(--ac)] font-black font-[var(--fe)] text-sm
                                flex items-center justify-center mb-4 relative z-10
                                bg-[var(--b0)]"
                  >
                    {s.num}
                  </div>
                  <p className="font-bold text-[0.85rem] text-[var(--c0)] mb-1">
                    {t(s.ar, s.en)}
                  </p>
                  <p className="text-[0.75rem] text-[var(--c2)]">
                    {t(s.dAr, s.dEn)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-[var(--bd)] px-6 py-20 bg-[var(--b2)]">
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="text-[1.9rem] font-black text-[var(--c0)] leading-snug mb-3"
            style={{ fontFamily: isAr ? "var(--fa)" : "var(--fd)" }}
          >
            {t("جاهز لتحويل مطعمك؟", "Ready to go digital?")}
          </h2>
          <p className="text-[0.85rem] text-[var(--c2)] mb-8 leading-relaxed">
            {t(
              "انضم لمئات المطاعم التي تدير عملياتها مع Vmenu.ai.",
              "Join hundreds of restaurants already running on Vmenu.ai."
            )}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-3.5 rounded-lg
                       bg-[var(--ac)] text-black font-bold text-sm
                       hover:opacity-90 active:scale-95 transition-all"
          >
            {t("ابدأ مجاناً الآن", "Start Free Now")}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--bd)] px-6 py-5
                         flex flex-wrap justify-between items-center gap-3">
        <span className="text-[0.72rem] text-[var(--c3)] font-[var(--fe)]">
          © 2025 Vmenu.ai
        </span>
        <div className="flex gap-5 text-[0.72rem] text-[var(--c2)] font-medium">
          <Link href="/login"  className="hover:text-[var(--c0)] transition-colors">
            {t("دخول", "Login")}
          </Link>
          <Link href="/signup" className="hover:text-[var(--c0)] transition-colors">
            {t("تسجيل", "Sign Up")}
          </Link>
        </div>
      </footer>

    </div>
  );
}
