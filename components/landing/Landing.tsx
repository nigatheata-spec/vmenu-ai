"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({ icon, titleAr, titleEn, descAr, descEn }: {
  icon: string; titleAr: string; titleEn: string; descAr: string; descEn: string;
}) {
  const { t } = useApp();
  return (
    <div className="bg-[var(--b2)] border border-[var(--bd)] rounded-[var(--r)] p-5
                    transition-all duration-300 hover:border-[var(--bda)] hover:-translate-y-0.5">
      <div className="w-10 h-10 rounded-[9px] bg-[var(--acs)] border border-[var(--bda)]
                      flex items-center justify-center text-xl mb-2.5">
        {icon}
      </div>
      <h3 className="text-[0.95rem] font-black mb-1">{t(titleAr, titleEn)}</h3>
      <p className="text-[0.82rem] text-[var(--c2)]">{t(descAr, descEn)}</p>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────
function StepCard({ num, icon, titleAr, titleEn, descAr, descEn }: {
  num: number; icon: string;
  titleAr: string; titleEn: string;
  descAr: string; descEn: string;
}) {
  const { t } = useApp();
  return (
    <div className="relative bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] p-5 pt-7">
      <div className="absolute -top-4 start-4 w-8 h-8 rounded-full bg-[var(--ac)] text-black
                      flex items-center justify-center font-black font-[var(--fe)]">
        {num}
      </div>
      <div className="text-[1.8rem] mb-2">{icon}</div>
      <h3 className="text-[0.95rem] font-black mb-1">{t(titleAr, titleEn)}</h3>
      <p className="text-[0.8rem] text-[var(--c2)]">{t(descAr, descEn)}</p>
    </div>
  );
}

// ── App mock preview ──────────────────────────────────────────
function AppMock() {
  return (
    <div
      className="w-full bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--r)] overflow-hidden
                 shadow-[0_30px_80px_rgba(0,0,0,.4)]"
      style={{ transform: "perspective(1000px) rotateY(-5deg)" }}
    >
      <div className="h-7 bg-[var(--b2)] flex items-center px-2.5 gap-1.5 border-b border-[var(--bd)]">
        <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <span className="w-2 h-2 rounded-full bg-[#28c840]" />
      </div>
      <div className="p-4 grid grid-cols-3 gap-2">
        {["📱", "📸", "🎬", "🎨", "📊", "🤖"].map((e, i) => (
          <div key={i} className="bg-[var(--b2)] rounded-[9px] p-3 border border-[var(--bd)]">
            <div className="text-xl mb-1.5">{e}</div>
            <div className="h-[7px] bg-[var(--b3)] rounded mb-1" />
            <div className="h-[7px] bg-[var(--b3)] rounded w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Landing ──────────────────────────────────────────────
export default function Landing() {
  const { state, dispatch, t } = useApp();
  const router = useRouter();
  const [trialLoading, setTrialLoading] = useState(false);

  const startTrial = async () => {
    setTrialLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--b0)]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 flex justify-between items-center px-5 py-3.5
                      bg-[var(--bg)] backdrop-blur-xl border-b border-[var(--bd)]">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-[var(--ac)] to-[var(--ac2)]
                          flex items-center justify-center text-black font-black text-sm font-[var(--fe)]">
            V
          </div>
          <span className="font-black text-[1.05rem] font-[var(--fd)]">
            Vmenu<span className="text-[var(--ac)]">.ai</span>
          </span>
        </div>

        {/* Nav actions */}
        <div className="flex gap-1.5 items-center">
          {/* Theme toggle */}
          <button
            onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" })}
            className="w-9 h-9 rounded-lg bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center
                       text-sm hover:bg-[var(--acs)] hover:border-[var(--ac)] transition-all"
            aria-label="Toggle theme"
          >
            {state.theme === "dark" ? "🌙" : "☀️"}
          </button>

          {/* Language toggle */}
          <button
            onClick={() => dispatch({ type: "SET_LANG", payload: state.lang === "ar" ? "en" : "ar" })}
            className="w-9 h-9 rounded-lg bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center
                       text-[0.68rem] font-black font-[var(--fe)] hover:bg-[var(--acs)] hover:border-[var(--ac)] transition-all"
            aria-label="Toggle language"
          >
            {state.lang === "ar" ? "EN" : "عربي"}
          </button>

          {/* Login — link to /login page */}
          <Link
            href="/login"
            className="px-5 py-2 rounded-full border-[1.5px] border-[var(--bd2)] text-[var(--c1)]
                       font-semibold text-sm hover:border-[var(--ac)] hover:text-[var(--ac)] transition-all"
          >
            {t("دخول", "Login")}
          </Link>

          {/* Start free — link to /signup page */}
          <Link
            href="/signup"
            className="px-5 py-2 rounded-full bg-gradient-to-br from-[var(--ac)] to-[var(--ac2)]
                       text-black font-bold text-sm active:scale-95 transition-all"
          >
            {t("ابدأ مجاناً", "Start Free")}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex items-center px-5 py-14 relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px]
                        bg-[radial-gradient(circle,var(--acs)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 w-full">

          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--acs)] border border-[var(--bda)]
                            rounded-full text-[0.75rem] font-bold text-[var(--ac)] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ac)] animate-pulse" />
              {t("مدعوم بالذكاء الاصطناعي", "Powered by AI")}
            </div>

            <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
              {t("حوّل مطعمك إلى", "Transform your restaurant to")}
              <br />
              <span className="bg-gradient-to-r from-[var(--ac)] to-[var(--ac2)] bg-clip-text text-transparent">
                {t("تجربة رقمية ذكية", "a smart digital experience")}
              </span>
            </h1>

            <p className="text-[var(--c1)] leading-relaxed mb-6 text-base">
              {t(
                "منيو QR، صور AI، فيديوهات، عروض ذكية — كل ما يحتاجه مطعمك",
                "QR menu, AI photos, videos, smart promos — everything your restaurant needs"
              )}
            </p>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/signup"
                className="px-7 py-3 rounded-full bg-gradient-to-br from-[var(--ac)] to-[var(--ac2)]
                           text-black font-bold text-[0.92rem] active:scale-95 transition-all"
              >
                {t("ابدأ مجاناً →", "Start Free →")}
              </Link>
              <button
                onClick={startTrial}
                disabled={trialLoading}
                className="px-7 py-3 rounded-full border-[1.5px] border-[var(--bd2)] text-[var(--c1)]
                           font-semibold text-[0.92rem] hover:border-[var(--ac)] hover:text-[var(--ac)]
                           transition-all disabled:opacity-60"
              >
                {trialLoading ? "⏳ جاري التحميل…" : t("تجربة مجانية", "Free Trial")}
              </button>
            </div>
          </div>

          {/* Mock app */}
          <div><AppMock /></div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-5 py-12 bg-[var(--b1)] border-t border-[var(--bd)]">
        <h2 className="text-center text-[1.6rem] font-black mb-8">
          {t("7 خدمات في منصة واحدة", "7 Services in One Platform")}
        </h2>
        <div className="max-w-[1100px] mx-auto grid gap-3.5"
             style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {[
            { icon: "📱", ar: "منيو + QR",    en: "Menu + QR",    dAr: "QR لكل طاولة، الزبون يطلب",      dEn: "QR per table, guests order" },
            { icon: "📸", ar: "صور AI",        en: "AI Photos",    dAr: "صورة جوال → احترافية 4K",         dEn: "Phone photo → 4K pro" },
            { icon: "🎬", ar: "فيديو",          en: "Video",        dAr: "منيو، ريلز، UGC، عروض",           dEn: "Menu, reels, UGC, promos" },
            { icon: "🎨", ar: "محرر المنيو",   en: "Menu Editor",  dAr: "5 ثيمات + تخصيص + drag&drop",    dEn: "5 themes + customization" },
            { icon: "📊", ar: "تحليلات",       en: "Analytics",    dAr: "KPIs لحظية + هندسة المنيو",       dEn: "Real-time KPIs" },
            { icon: "🤖", ar: "عروض AI",       en: "AI Promos",    dAr: "Claude Sonnet يحلل ويقترح",       dEn: "Claude Sonnet analyzes" },
          ].map((f) => (
            <FeatureCard key={f.en} icon={f.icon} titleAr={f.ar} titleEn={f.en} descAr={f.dAr} descEn={f.dEn} />
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-5 py-12 bg-[var(--b0)]">
        <h2 className="text-center text-[1.6rem] font-black mb-2">
          {t("كيف تعمل المنصة؟", "How It Works")}
        </h2>
        <p className="text-center text-sm text-[var(--c2)] mb-9">
          {t("4 خطوات بسيطة من التسجيل إلى أول طلب", "4 simple steps from signup to first order")}
        </p>
        <div className="max-w-[1000px] mx-auto grid gap-6 mt-6"
             style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {[
            { num: 1, icon: "✍️", ar: "سجّل مطعمك",      en: "Register",    dAr: "اسم المطعم، المدينة — 30 ثانية",    dEn: "Restaurant name, city — 30s" },
            { num: 2, icon: "🎨", ar: "صمّم المنيو",       en: "Design Menu", dAr: "5 ثيمات + drag & drop + صور AI",   dEn: "5 themes + drag & drop + AI" },
            { num: 3, icon: "📱", ar: "ضع QR على الطاولة", en: "Place QR",    dAr: "الزبون يمسح ويطلب مباشرة",         dEn: "Guests scan & order instantly" },
            { num: 4, icon: "🚀", ar: "انطلق!",            en: "Launch!",     dAr: "الطلبات تصل + Claude يقترح عروضاً", dEn: "Orders flow + Claude suggests promos" },
          ].map((s) => (
            <StepCard key={s.num} {...s} titleAr={s.ar} titleEn={s.en} descAr={s.dAr} descEn={s.dEn} />
          ))}
        </div>
      </section>

      {/* ── CTA bottom ── */}
      <section className="px-5 py-16 bg-[var(--b1)] border-t border-[var(--bd)] text-center">
        <h2 className="text-2xl font-black mb-3">
          {t("جاهز لبدء رحلتك الرقمية؟", "Ready to go digital?")}
        </h2>
        <p className="text-sm text-[var(--c2)] mb-6">
          {t("انضم لمئات المطاعم التي تستخدم Vmenu.ai", "Join hundreds of restaurants using Vmenu.ai")}
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-base text-black
                     bg-gradient-to-br from-[var(--ac)] to-[var(--ac2)] active:scale-95 transition-all"
          style={{ boxShadow: "0 4px 24px rgba(255,180,50,.35)" }}
        >
          {t("ابدأ مجاناً الآن ←", "Start Free Now →")}
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 py-4 border-t border-[var(--bd)] flex flex-wrap justify-between items-center gap-2">
        <span className="text-[0.78rem] text-[var(--c3)]">
          © 2024 Vmenu.ai — {t("جميع الحقوق محفوظة", "All rights reserved")}
        </span>
        <div className="flex gap-4 text-[0.78rem] text-[var(--c2)]">
          <Link href="/login"  className="hover:text-[var(--ac)] transition-colors">{t("دخول", "Login")}</Link>
          <Link href="/signup" className="hover:text-[var(--ac)] transition-colors">{t("تسجيل", "Sign Up")}</Link>
        </div>
      </footer>
    </div>
  );
}
