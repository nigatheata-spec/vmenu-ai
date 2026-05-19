"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/context";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/shared/ui";

// ── Types ─────────────────────────────────────────────────────
interface PromoSuggestion {
  emoji: string;
  color: string;
  bg: string;
  tagAr: string;
  tagEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  discount: string;
  expected: string;
  periodAr: string;
  periodEn: string;
}

interface ActivePromo {
  emoji: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  uses: number;
  revenue: string;
}

const DEMO_SUGGESTIONS: PromoSuggestion[] = [
  {
    emoji: "🎁",
    color: "var(--ac)", bg: "var(--acs)",
    tagAr: "باندل", tagEn: "BUNDLE",
    titleAr: "باندل الغداء المميز", titleEn: "Lunch Combo",
    descAr: "سماش برقر + بطاطس + موهيتو بخصم 15%. يرفع الفاتورة 22 ريال.",
    descEn: "Smash Burger + Fries + Mojito 15% off. Raises ticket 22 SAR.",
    discount: "15%", expected: "+12%", periodAr: "12-15", periodEn: "12-3 PM",
  },
  {
    emoji: "⏰",
    color: "var(--in)", bg: "var(--ins)",
    tagAr: "ساعة سعيدة", tagEn: "HAPPY HOUR",
    titleAr: "ساعة الركود — 3 عصراً", titleEn: "Slow Hour 3 PM",
    descAr: "20% خصم على المشروبات والحلويات بين 3-5 عصراً.",
    descEn: "20% off drinks & desserts 3-5 PM.",
    discount: "20%", expected: "+28%", periodAr: "15-17", periodEn: "3-5 PM",
  },
  {
    emoji: "🌧️",
    color: "var(--cy)", bg: "rgba(34,211,238,.08)",
    tagAr: "طقس", tagEn: "WEATHER",
    titleAr: "عرض يوم المطر", titleEn: "Rainy Day",
    descAr: "توقعات أمطار الأربعاء. 15% خصم على الشوربات.",
    descEn: "Rain forecast Wednesday. 15% off soups.",
    discount: "15%", expected: "+18%", periodAr: "الأربعاء", periodEn: "Wednesday",
  },
];

// ── KPI strip ─────────────────────────────────────────────────
function PromosKpi({ activeCount }: { activeCount: number }) {
  const { t } = useApp();
  const kpis = [
    { icon: "📈", value: "+18%", label: t("زيادة الإيرادات", "Revenue up"), color: "var(--sc)" },
    { icon: "🏷️", value: String(activeCount), label: t("عروض نشطة", "Active promos"), color: "var(--ac)" },
    { icon: "🎫", value: "342", label: t("استخدام", "Uses"), color: "var(--in)" },
    { icon: "💰", value: "$0.28", label: t("تكلفة AI", "AI Cost"), color: "var(--pp)" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
      {kpis.map((k) => (
        <div key={k.label} className="bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] p-3.5 text-center">
          <div className="text-xl mb-1">{k.icon}</div>
          <div className="text-2xl font-black font-[var(--fe)]" style={{ color: k.color }}>{k.value}</div>
          <div className="text-[0.68rem] text-[var(--c2)] mt-0.5">{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Suggestion card ───────────────────────────────────────────
function SuggestionCard({ promo, onApprove, onReject }: {
  promo: PromoSuggestion; onApprove: () => void; onReject: () => void;
}) {
  const { t } = useApp();
  return (
    <div className="bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] overflow-hidden mb-3">
      <div className="flex">
        <div className="w-[50px] flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: promo.bg }}>
          {promo.emoji}
        </div>
        <div className="flex-1 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-base font-extrabold">{t(promo.titleAr, promo.titleEn)}</span>
            <span className="text-[0.58rem] px-2 py-0.5 rounded-full font-bold font-[var(--fe)]"
              style={{ background: promo.bg, color: promo.color, border: `1px solid ${promo.color}30` }}>
              {t(promo.tagAr, promo.tagEn)}
            </span>
          </div>
          <div className="text-sm text-[var(--c1)] mb-2 leading-relaxed">
            {t(promo.descAr, promo.descEn)}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--c2)]">
            <span>🏷️ {promo.discount}</span>
            <span>📈 {promo.expected}</span>
            <span>🕐 {t(promo.periodAr, promo.periodEn)}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-4 py-2.5 border-t border-[var(--bd)] bg-[var(--b2)]">
        <button onClick={onApprove}
          className="px-4 py-1.5 rounded-full text-sm font-semibold text-white"
          style={{ background: "var(--sc)" }}>
          ✓ {t("اعتماد", "Approve")}
        </button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold border border-[var(--bd2)] text-[var(--c1)]"
          style={{ background: "var(--b3)" }}>
          ✏️ {t("تعديل", "Edit")}
        </button>
        <button onClick={onReject}
          className="px-4 py-1.5 rounded-full text-sm font-semibold border"
          style={{ background: "var(--dgs)", borderColor: "var(--dg)", color: "var(--dg)" }}>
          ✕ {t("رفض", "Reject")}
        </button>
      </div>
    </div>
  );
}

// ── Active promo card ─────────────────────────────────────────
function ActivePromoCard({ promo, onPause }: { promo: ActivePromo; onPause: () => void }) {
  const { t } = useApp();
  return (
    <div className="bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] overflow-hidden mb-3">
      <div className="flex">
        <div className="w-[50px] flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: "var(--scs)" }}>
          {promo.emoji}
        </div>
        <div className="flex-1 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-base font-extrabold">{t(promo.titleAr, promo.titleEn)}</span>
            <span className="text-[0.58rem] px-2 py-0.5 rounded-full font-bold bg-[var(--scs)] text-[var(--sc)]">
              {t("نشط", "Active")}
            </span>
          </div>
          <div className="text-sm text-[var(--c1)] mb-2">{t(promo.descAr, promo.descEn)}</div>
          <div className="flex gap-3 text-xs text-[var(--c2)]">
            <span>🎫 {promo.uses} {t("استخدام", "uses")}</span>
            <span>💰 {promo.revenue}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-4 py-2.5 border-t border-[var(--bd)] bg-[var(--b2)]">
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold border border-[var(--bd2)] text-[var(--c1)]"
          style={{ background: "var(--b3)" }}>
          ✏️ {t("تعديل", "Edit")}
        </button>
        <button onClick={onPause}
          className="px-4 py-1.5 rounded-full text-sm font-semibold border"
          style={{ background: "var(--wrs)", borderColor: "var(--wr)", color: "var(--wr)" }}>
          ⏸ {t("إيقاف", "Pause")}
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function AiPromos() {
  const { t } = useApp();
  const { toasts, toast } = useToast();

  const [suggestions, setSuggestions] = useState<PromoSuggestion[]>([]);
  const [active, setActive]           = useState<ActivePromo[]>([]);
  const [generating, setGenerating]   = useState(false);

  const generate = () => {
    setGenerating(true);
    toast(t("⏳ Claude يحلل بياناتك…", "⏳ Claude analyzing your data…"), "i");
    setTimeout(() => {
      setSuggestions([...DEMO_SUGGESTIONS]);
      setGenerating(false);
      toast(t("✓ 3 اقتراحات جاهزة", "✓ 3 suggestions ready"), "s");
    }, 1600);
  };

  const approve = (i: number) => {
    const p = suggestions[i];
    setActive((prev) => [...prev, { emoji: p.emoji, titleAr: p.titleAr, titleEn: p.titleEn, descAr: p.descAr, descEn: p.descEn, uses: 0, revenue: "0 SAR" }]);
    setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
    toast(t("✓ تم الاعتماد", "✓ Approved"), "s");
  };

  const reject = (i: number) => {
    setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const pause = (i: number) => {
    setActive((prev) => prev.filter((_, idx) => idx !== i));
    toast(t("✓ تم الإيقاف", "✓ Paused"), "i");
  };

  return (
    <div className="p-4 md:p-5">
      <ToastContainer toasts={toasts} />

      {/* Generate button (top bar slot) */}
      <div className="flex justify-end mb-4">
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,var(--ac),var(--ac2))", color: "#000" }}>
          {generating ? `⏳ ${t("يعمل…", "Working…")}` : `✨ ${t("توليد عروض", "Generate Promos")}`}
        </button>
      </div>

      {/* KPIs */}
      <PromosKpi activeCount={active.length} />

      {/* Suggestions */}
      <div className="text-base font-extrabold mb-3 flex items-center gap-2">
        🤖 {t("اقتراحات الذكاء الاصطناعي", "AI Suggestions")}
      </div>

      {suggestions.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-[var(--bd2)] rounded-[var(--r)] bg-[var(--b1)] mb-6">
          <div className="text-4xl mb-2">🤖</div>
          <div className="text-sm text-[var(--c3)]">
            {t("اضغط \"توليد عروض\" للاقتراحات", "Click \"Generate Promos\" for suggestions")}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {suggestions.map((p, i) => (
            <SuggestionCard key={i} promo={p} onApprove={() => approve(i)} onReject={() => reject(i)} />
          ))}
        </div>
      )}

      {/* Active promos */}
      <div className="text-base font-extrabold mb-3 flex items-center gap-2">
        🏷️ {t("العروض النشطة", "Active Promos")}
      </div>
      {active.length === 0 ? (
        <div className="py-6 text-center text-sm text-[var(--c3)]">
          {t("لا عروض نشطة", "No active promos")}
        </div>
      ) : (
        active.map((p, i) => (
          <ActivePromoCard key={i} promo={p} onPause={() => pause(i)} />
        ))
      )}
    </div>
  );
}
