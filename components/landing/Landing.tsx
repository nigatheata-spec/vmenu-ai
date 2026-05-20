"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import {
  QrCode,
  Camera,
  FilmSlate,
  PaintBrush,
  ChartBar,
  Robot,
  Package,
  ArrowRight,
  ArrowUpRight,
  Sun,
  Moon,
  Translate,
  TrendUp,
  Sparkle,
  CheckCircle,
  Star,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const MENU_PHOTOS = [
  { seed: "wagyu-smash-burger",  ar: "سماش برقر واجيو",  en: "Wagyu Smash",       price: "59",  cat: "برقر" },
  { seed: "truffle-pizza-2024",  ar: "بيتزا ترافل أسود", en: "Truffle Pizza",     price: "75",  cat: "بيتزا" },
  { seed: "basque-cheesecake",   ar: "تشيز كيك باسك",    en: "Basque Cheesecake", price: "35",  cat: "حلويات" },
  { seed: "grilled-chicken-herb",ar: "دجاج مشوي بالأعشاب",en: "Herb Chicken",     price: "65",  cat: "دجاج" },
  { seed: "strawberry-mojito",   ar: "موهيتو فراولة",    en: "Strawberry Mojito", price: "22",  cat: "مشروبات" },
  { seed: "truffle-fries-golden",ar: "بطاطس ترافل",      en: "Truffle Fries",     price: "25",  cat: "إضافات" },
] as const;

const FEATURES = [
  { icon: QrCode,    ar: "منيو + QR",        en: "Menu + QR",        dAr: "رمز QR لكل طاولة. الزبون يطلب مباشرة.",              dEn: "Per-table QR. Guests order instantly." },
  { icon: Camera,    ar: "صور AI",             en: "AI Photos",        dAr: "صورة جوال تصبح لقطة احترافية في ثوانٍ.",             dEn: "Phone shot becomes a 4K product image." },
  { icon: FilmSlate, ar: "محتوى الفيديو",      en: "Video Content",    dAr: "ريلز، UGC، إعلانات — كل شيء من مكان واحد.",         dEn: "Reels, UGC, promos. All from one place." },
  { icon: PaintBrush,ar: "محرر المنيو",         en: "Menu Editor",      dAr: "خمسة ثيمات، drag & drop، تحكم كامل.",                dEn: "Five themes, drag & drop, full control." },
  { icon: ChartBar,  ar: "تحليلات لحظية",      en: "Live Analytics",   dAr: "KPIs في الوقت الفعلي وهندسة المنيو.",                dEn: "Real-time KPIs and smart menu engineering." },
  { icon: Robot,     ar: "عروض AI",             en: "AI Promos",        dAr: "Claude يحلل مبيعاتك ويقترح عروضاً رابحة.",           dEn: "Claude reads your sales, suggests promos." },
  { icon: Package,   ar: "إدارة الطلبات",      en: "Orders",           dAr: "طلبات الطاولات لحظياً مع تنبيه صوتي.",               dEn: "Live table orders with audio alerts." },
] as const;

const STEPS = [
  { num: "01", ar: "سجّل مطعمك",       en: "Register",    dAr: "30 ثانية فقط",            dEn: "30 seconds." },
  { num: "02", ar: "صمّم المنيو",        en: "Design",      dAr: "ثيم + صور AI",             dEn: "Theme + AI photos." },
  { num: "03", ar: "ضع QR على الطاولة", en: "Place QR",    dAr: "الزبون يمسح ويطلب",       dEn: "Guests scan and order." },
  { num: "04", ar: "انطلق",             en: "Launch",      dAr: "عروض وتحليلات تلقائية",   dEn: "Promos and analytics, automatic." },
] as const;

// ─────────────────────────────────────────────
// HERO PANEL
// ─────────────────────────────────────────────

function HeroPanel({ isAr }: { isAr: boolean }) {
  const bars = [55, 70, 45, 85, 60, 90, 72];
  const orders = [
    { id: "#1042", item: isAr ? "سماش برقر" : "Wagyu Smash",    price: "59" },
    { id: "#1041", item: isAr ? "بيتزا ترافل" : "Truffle Pizza", price: "75" },
    { id: "#1040", item: isAr ? "موهيتو فراولة" : "Strawberry Mojito", price: "22" },
  ];

  return (
    <div className="relative h-[420px] w-full select-none pointer-events-none">
      {/* Main metric card */}
      <div
        className="absolute top-0 inset-x-0 bg-[var(--b1)] border border-[var(--bd2)]
                   rounded-2xl p-5 animate-float"
        style={{ animationDelay: "0s", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[0.65rem] font-semibold text-[var(--c2)] uppercase tracking-widest font-[var(--fe)]">
              {isAr ? "طلبات اليوم" : "Today's Orders"}
            </p>
            <p className="text-3xl font-black text-[var(--c0)] font-[var(--fe)] leading-none mt-0.5">
              342
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--scs)]">
            <TrendUp size={12} weight="bold" color="var(--sc)" />
            <span className="text-[0.65rem] font-bold text-[var(--sc)] font-[var(--fe)]">+18%</span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-10">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-sm"
              style={{ height: `${h}%`, background: i === 6 ? "var(--ac)" : "var(--b3)" }} />
          ))}
        </div>
      </div>

      {/* Orders list card */}
      <div
        className="absolute top-[168px] inset-x-0 bg-[var(--b1)] border border-[var(--bd)]
                   rounded-2xl overflow-hidden animate-floatSlow"
        style={{ animationDelay: "1.2s", boxShadow: "0 16px 40px rgba(0,0,0,0.2)" }}
      >
        {orders.map((o, i) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-2.5"
            style={{ borderTop: i > 0 ? "1px solid var(--bd)" : "none" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--sc)]" />
              <span className="text-[0.68rem] font-[var(--fe)] text-[var(--c3)]">{o.id}</span>
              <span className="text-[0.78rem] font-semibold text-[var(--c0)]">{o.item}</span>
            </div>
            <span className="text-[0.72rem] font-black font-[var(--fe)] text-[var(--ac)]">
              {isAr ? `${o.price} ر.س` : `SAR ${o.price}`}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--acs)] border-t border-[var(--bda)]">
          <Sparkle size={12} weight="fill" color="var(--ac)" />
          <span className="text-[0.7rem] text-[var(--ac)] font-semibold">
            {isAr ? 'Claude: "عزّز البيتزا بتخفيض 10% الليلة"' : 'Claude: "Boost pizza — 10% off tonight"'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PHOTO CARD
// ─────────────────────────────────────────────

function MenuPhotoCard({
  seed, nameAr, nameEn, price, cat, isAr, index,
}: {
  seed: string; nameAr: string; nameEn: string;
  price: string; cat: string; isAr: boolean; index: number;
}) {
  return (
    <div
      className="relative shrink-0 w-52 rounded-2xl overflow-hidden border border-[var(--bd)]
                 hover:-translate-y-2 transition-transform duration-500 cursor-pointer group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Photo */}
      <div className="relative h-64 overflow-hidden bg-[var(--b2)]">
        <Image
          src={`https://picsum.photos/seed/${seed}/400/500`}
          alt={isAr ? nameAr : nameEn}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          style={{ filter: "brightness(1.08) saturate(1.3) contrast(1.05)" }}
          unoptimized
        />
        {/* AI badge */}
        <div className="absolute top-3 end-3 flex items-center gap-1 px-2 py-0.5
                        rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
          <Sparkle size={9} weight="fill" color="var(--ac)" />
          <span className="text-[0.6rem] font-bold font-[var(--fe)] text-[var(--ac)]">AI</span>
        </div>
        {/* Star rating */}
        <div className="absolute top-3 start-3 flex items-center gap-0.5">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={9} weight="fill" color="#ffb432" />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 bg-[var(--b1)]">
        <p className="text-[0.7rem] text-[var(--ac)] font-semibold mb-0.5">
          {cat}
        </p>
        <p className="font-black text-[0.88rem] text-[var(--c0)] leading-snug mb-2"
          style={{ fontFamily: isAr ? "var(--ff)" : "var(--fe)" }}>
          {isAr ? nameAr : nameEn}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-black text-sm font-[var(--fe)] text-[var(--ac)]">
            {isAr ? `${price} ر.س` : `SAR ${price}`}
          </span>
          <div className="w-6 h-6 rounded-full bg-[var(--ac)] flex items-center justify-center">
            <span className="text-black font-black text-sm leading-none">+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN LANDING
// ─────────────────────────────────────────────

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
    <div className="min-h-[100dvh] flex flex-col bg-[var(--b0)]" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-6
                      bg-[var(--bg)] backdrop-blur-xl border-b border-[var(--bd)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--ac)] flex items-center justify-center">
            <span className="text-black font-black text-xs font-[var(--fe)]">V</span>
          </div>
          <span className="font-black text-[0.95rem] font-[var(--fd)] tracking-tight">
            Vmenu<span className="text-[var(--ac)]">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" })}
            className="w-8 h-8 rounded-lg bg-[var(--b2)] border border-[var(--bd)]
                       flex items-center justify-center text-[var(--c2)]
                       hover:border-[var(--bd2)] hover:text-[var(--c0)] transition-colors"
            aria-label="Toggle theme"
          >
            {state.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => dispatch({ type: "SET_LANG", payload: isAr ? "en" : "ar" })}
            className="w-8 h-8 rounded-lg bg-[var(--b2)] border border-[var(--bd)]
                       flex items-center justify-center text-[var(--c2)]
                       hover:border-[var(--bd2)] hover:text-[var(--c0)] transition-colors"
            aria-label="Toggle language"
          >
            <Translate size={15} />
          </button>
          <Link href="/login"
            className="px-4 h-8 rounded-lg border border-[var(--bd2)] text-[var(--c2)]
                       text-[0.8rem] font-medium flex items-center
                       hover:border-[var(--ac)] hover:text-[var(--c0)] transition-all">
            {t("دخول", "Login")}
          </Link>
          <Link href="/signup"
            className="px-4 h-8 rounded-lg bg-[var(--ac)] text-black text-[0.8rem] font-bold
                       flex items-center gap-1.5
                       hover:opacity-90 active:scale-[0.98] transition-all">
            {t("ابدأ مجاناً", "Start Free")}
            <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex-1 flex items-center min-h-[calc(100dvh-56px)] px-6 py-16 overflow-hidden">

        {/* Background photo with dark overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://picsum.photos/seed/restaurant-ambiance/1600/900"
            alt=""
            fill
            className="object-cover opacity-20"
            style={{ filter: "saturate(0.4) brightness(0.5)" }}
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--b0)] via-[var(--b0)]/80 to-[var(--b0)]" />
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--acs),transparent)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full
                        grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 lg:gap-24 items-center">
          {/* Text */}
          <div className="animate-fadeUp">
            <p className="text-[0.68rem] font-bold font-[var(--fe)] text-[var(--ac)]
                          uppercase tracking-[0.18em] mb-6">
              {t("منصة إدارة المطاعم", "Restaurant Management Platform")}
            </p>

            <h1
              className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold leading-[1.08] text-[var(--c0)] mb-6"
              style={{
                fontFamily: isAr ? "var(--ff)" : "var(--fd)",
                letterSpacing: isAr ? "-0.01em" : "-0.04em",
                fontWeight: isAr ? 700 : 800,
              }}
            >
              {t("مطعمك الرقمي", "Your restaurant,")}
              <br />
              <span className="text-[var(--ac)]">
                {t("يبدأ هنا.", "starts here.")}
              </span>
            </h1>

            <p className="text-[var(--c2)] text-base leading-relaxed max-w-[48ch] mb-10">
              {t(
                "منيو QR، صور AI، عروض ذكية، تحليلات لحظية. سبع أدوات في منصة واحدة.",
                "QR menus, AI photos, smart promos, live analytics. Seven tools, one platform."
              )}
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/signup"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-lg
                           bg-[var(--ac)] text-black font-bold text-[0.88rem]
                           hover:opacity-90 active:scale-[0.98] transition-all">
                {t("ابدأ مجاناً", "Start Free")}
                <ArrowRight size={15} weight="bold" />
              </Link>
              <button
                onClick={startTrial}
                disabled={trialLoading}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-lg
                           border border-[var(--bd2)] text-[var(--c2)] font-medium text-[0.88rem]
                           hover:border-[var(--ac)] hover:text-[var(--c0)]
                           active:scale-[0.98] transition-all disabled:opacity-40">
                {trialLoading ? t("جاري…", "Loading…") : t("جرّب مجاناً", "Free Trial")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle size={14} weight="fill" color="var(--sc)" />
              <span className="text-[0.75rem] text-[var(--c2)]">
                {t("لا يلزم بطاقة ائتمان · إعداد في 30 ثانية", "No credit card · Setup in 30 seconds")}
              </span>
            </div>
          </div>

          {/* Live dashboard */}
          <div className="hidden lg:block animate-slideInRight">
            <HeroPanel isAr={isAr} />
          </div>
        </div>
      </section>

      {/* ── Photo Showcase ── */}
      <section className="border-t border-[var(--bd)] bg-[var(--b1)] py-16 overflow-hidden">
        <div className="px-6 mb-10">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold font-[var(--fe)] text-[var(--ac)]
                            uppercase tracking-[0.18em] mb-2">
                {t("استوديو الصور", "AI Photo Studio")}
              </p>
              <h2
                className="text-[clamp(1.5rem,2.8vw,2.2rem)] font-bold text-[var(--c0)] leading-tight"
                style={{
                  fontFamily: isAr ? "var(--ff)" : "var(--fd)",
                  letterSpacing: isAr ? "-0.01em" : "-0.03em",
                }}
              >
                {t("صور مطعمك بدقة 4K", "4K photos for your menu.")}
                <br />
                <span className="text-[var(--c2)] font-medium text-[0.8em]">
                  {t("من صورة جوال واحدة.", "From a single phone shot.")}
                </span>
              </h2>
            </div>
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold
                         text-[var(--ac)] hover:opacity-70 transition-opacity shrink-0 self-start lg:self-auto">
              {t("جرّب الآن", "Try it free")}
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </div>

        {/* Horizontally scrolling photo strip */}
        <div className="flex gap-4 px-6 overflow-x-auto pb-4 scrollbar-none"
             style={{ scrollSnapType: "x mandatory" }}>
          {/* Left padding spacer for max-w alignment */}
          <div className="shrink-0 hidden lg:block"
               style={{ width: "calc((100vw - min(100vw, 1280px)) / 2)" }} />

          {MENU_PHOTOS.map((p, i) => (
            <div key={p.seed} style={{ scrollSnapAlign: "start" }}>
              <MenuPhotoCard
                seed={p.seed}
                nameAr={p.ar}
                nameEn={p.en}
                price={p.price}
                cat={p.cat}
                isAr={isAr}
                index={i}
              />
            </div>
          ))}

          {/* Trailing CTA card */}
          <div className="shrink-0 w-52 rounded-2xl border border-dashed border-[var(--bda)]
                          flex flex-col items-center justify-center gap-3 p-6 text-center
                          bg-[var(--acs)] cursor-pointer hover:border-[var(--ac)] transition-colors"
               onClick={startTrial}>
            <div className="w-10 h-10 rounded-full bg-[var(--ac)] flex items-center justify-center">
              <Camera size={18} weight="duotone" color="black" />
            </div>
            <p className="text-[0.8rem] font-bold text-[var(--c0)]"
               style={{ fontFamily: isAr ? "var(--ff)" : "var(--fe)" }}>
              {t("أضف صور مطعمك", "Add your menu photos")}
            </p>
            <p className="text-[0.72rem] text-[var(--c2)]">
              {t("مجاناً", "It's free")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-[var(--bd)] px-6 py-20 bg-[var(--b0)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14 gap-4">
            <h2
              className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[var(--c0)] leading-tight"
              style={{
                fontFamily: isAr ? "var(--ff)" : "var(--fd)",
                letterSpacing: isAr ? "-0.01em" : "-0.03em",
              }}
            >
              {t("كل ما يحتاجه مطعمك", "Everything your")}
              <br />
              <span className="text-[var(--c2)] font-medium">
                {t("في مكان واحد.", "restaurant needs.")}
              </span>
            </h2>
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold
                         text-[var(--ac)] hover:opacity-70 transition-opacity shrink-0">
              {t("ابدأ الآن", "Get started")}
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
            {/* Featured first */}
            <div className="bg-[var(--b1)] border border-[var(--bd)] rounded-2xl p-8
                            flex flex-col justify-between min-h-[260px]
                            hover:border-[var(--bda)] transition-colors group relative overflow-hidden">
              {/* Subtle bg photo */}
              <div className="absolute inset-0 opacity-5">
                <Image
                  src="https://picsum.photos/seed/qr-menu-bg/600/400"
                  alt="" fill className="object-cover" unoptimized
                />
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-[var(--acs)] border border-[var(--bda)]
                                flex items-center justify-center text-[var(--ac)]
                                group-hover:scale-110 transition-transform mb-6">
                  <QrCode size={20} weight="duotone" />
                </div>
                <h3
                  className="text-[1.15rem] font-bold text-[var(--c0)] mb-2"
                  style={{ fontFamily: isAr ? "var(--ff)" : "var(--fd)" }}
                >
                  {t("منيو QR لكل طاولة", "QR Menu for Every Table")}
                </h3>
                <p className="text-[0.83rem] text-[var(--c2)] leading-relaxed max-w-[36ch]">
                  {t(
                    "كل طاولة لها رمز QR خاص. الزبون يمسح ويطلب مباشرة بدون تطبيق ولا موظف.",
                    "Every table gets its own QR. Guests scan and order instantly — no app, no staff required."
                  )}
                </p>
              </div>
            </div>

            {/* Remaining as rows */}
            <div className="divide-y divide-[var(--bd)]">
              {FEATURES.slice(1).map(({ icon: Icon, ar, en, dAr, dEn }) => (
                <div key={en} className="flex items-center gap-4 py-4 group">
                  <div className="w-8 h-8 rounded-lg bg-[var(--b1)] border border-[var(--bd)]
                                  flex items-center justify-center text-[var(--c2)] shrink-0
                                  group-hover:border-[var(--bda)] group-hover:text-[var(--ac)]
                                  transition-all">
                    <Icon size={16} weight="regular" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[0.85rem] text-[var(--c0)]">{t(ar, en)}</p>
                    <p className="text-[0.76rem] text-[var(--c2)]">{t(dAr, dEn)}</p>
                  </div>
                  <ArrowUpRight size={13} weight="bold"
                    className="text-[var(--c3)] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="border-t border-[var(--bd)] px-6 py-20 bg-[var(--b1)]">
        <div className="max-w-7xl mx-auto">
          <p className="text-[0.68rem] font-bold font-[var(--fe)] text-[var(--ac)]
                        uppercase tracking-[0.18em] mb-3">
            {t("البداية سهلة", "Simple by design")}
          </p>
          <h2
            className="text-[clamp(1.5rem,2.8vw,2.2rem)] font-bold text-[var(--c0)] mb-16"
            style={{
              fontFamily: isAr ? "var(--ff)" : "var(--fd)",
              letterSpacing: isAr ? "-0.01em" : "-0.03em",
            }}
          >
            {t("من التسجيل إلى أول طلب في دقائق.", "From signup to first order in minutes.")}
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 h-px bg-[var(--bd2)]"
                    style={{ insetInlineStart: "calc(50% + 22px)", insetInlineEnd: 0 }} />
                )}
                <div className="flex flex-col lg:items-center lg:text-center lg:px-4">
                  <div className="w-10 h-10 rounded-full border border-[var(--bd2)] bg-[var(--b0)]
                                  flex items-center justify-center mb-4 relative z-10">
                    <span className="text-[0.72rem] font-black font-[var(--fe)] text-[var(--ac)]">{s.num}</span>
                  </div>
                  <p className="font-bold text-[0.88rem] text-[var(--c0)] mb-1"
                     style={{ fontFamily: isAr ? "var(--ff)" : undefined }}>
                    {t(s.ar, s.en)}
                  </p>
                  <p className="text-[0.75rem] text-[var(--c2)]">{t(s.dAr, s.dEn)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-[var(--bd)] px-6 py-24 bg-[var(--b0)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,var(--acs),transparent)]" />
        <div className="relative z-10 max-w-7xl mx-auto
                        grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <h2
              className="text-[clamp(1.8rem,3.5vw,3rem)] font-bold text-[var(--c0)] leading-tight mb-3"
              style={{
                fontFamily: isAr ? "var(--ff)" : "var(--fd)",
                letterSpacing: isAr ? "-0.01em" : "-0.04em",
              }}
            >
              {t("جاهز لتحويل مطعمك؟", "Ready to go digital?")}
            </h2>
            <p className="text-[0.88rem] text-[var(--c2)] max-w-[44ch]">
              {t(
                "انضم لمئات المطاعم التي تدير عملياتها مع Vmenu.ai.",
                "Join hundreds of restaurants already running on Vmenu.ai."
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg
                         bg-[var(--ac)] text-black font-bold text-[0.88rem]
                         hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap">
              {t("ابدأ مجاناً الآن", "Start Free Now")}
              <ArrowRight size={15} weight="bold" />
            </Link>
            <button
              onClick={startTrial}
              disabled={trialLoading}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg
                         border border-[var(--bd2)] text-[var(--c2)] font-medium text-[0.88rem]
                         hover:border-[var(--ac)] hover:text-[var(--c0)]
                         active:scale-[0.98] transition-all disabled:opacity-40 whitespace-nowrap">
              {t("جرّب الديمو", "Try Demo")}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--bd)] px-6 py-5
                         flex flex-wrap justify-between items-center gap-3">
        <span className="text-[0.72rem] text-[var(--c3)] font-[var(--fe)]">© 2025 Vmenu.ai</span>
        <div className="flex gap-5 text-[0.72rem] text-[var(--c2)]">
          <Link href="/login"  className="hover:text-[var(--c0)] transition-colors">{t("دخول", "Login")}</Link>
          <Link href="/signup" className="hover:text-[var(--c0)] transition-colors">{t("تسجيل", "Sign Up")}</Link>
        </div>
      </footer>
    </div>
  );
}
