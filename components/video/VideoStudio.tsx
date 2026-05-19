"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/context";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/shared/ui";

// ── Video type configuration ─────────────────────────────────
type VideoType = "menu" | "reel" | "ugc" | "promo";

interface StyleOption {
  promptId: string;
  icon: string;
  ar: string;
  en: string;
  api: string;
  cost: string;
}

const VIDEO_CONFIG: Record<VideoType, { labelAr: string; labelEn: string; icon: string; styles: StyleOption[]; platforms?: { key: string; ar: string; en: string; ratio: string }[] }> = {
  menu: {
    labelAr: "فيديو منيو", labelEn: "Menu Video", icon: "🎬",
    styles: [
      { promptId: "2.1", icon: "🌑", ar: "Dark Cinematic", en: "Dark Cinematic", api: "Kling 2.6 Pro", cost: "$0.56/10s" },
      { promptId: "2.2", icon: "☀️", ar: "Light Cinematic", en: "Light Cinematic", api: "Veo 3.1 Fast", cost: "$0.50/10s" },
      { promptId: "2.3", icon: "🧪", ar: "Ingredients Reveal", en: "Ingredients Reveal", api: "Pika 2.2", cost: "$0.30/clip" },
      { promptId: "2.4", icon: "🔪", ar: "Product Splitting", en: "Product Splitting", api: "Seedance 2.0 Pro", cost: "$0.47/10s" },
      { promptId: "2.5", icon: "🏢", ar: "Modern Environment", en: "Modern Environment", api: "Runway Gen-4.5", cost: "$1.20/10s" },
      { promptId: "2.6", icon: "🎭", ar: "Reference Style", en: "Reference Style", api: "Seedance R2V", cost: "$0.30/10s" },
    ],
  },
  reel: {
    labelAr: "ريلز سوشيال", labelEn: "Social Reel", icon: "📱",
    platforms: [
      { key: "instagram", ar: "Instagram", en: "Instagram", ratio: "9:16" },
      { key: "tiktok", ar: "TikTok", en: "TikTok", ratio: "9:16" },
      { key: "youtube", ar: "YouTube Shorts", en: "YouTube Shorts", ratio: "9:16" },
      { key: "snapchat", ar: "Snapchat", en: "Snapchat", ratio: "9:16" },
    ],
    styles: [
      { promptId: "3.1-e", icon: "⚡", ar: "Energetic", en: "Energetic", api: "Hailuo 02 Pro", cost: "$0.04/s" },
      { promptId: "3.1-a", icon: "🌙", ar: "Aesthetic", en: "Aesthetic", api: "Hailuo 02 Pro", cost: "$0.04/s" },
      { promptId: "3.1-s", icon: "🎙️", ar: "ASMR", en: "ASMR", api: "Hailuo 02 Pro", cost: "$0.04/s" },
      { promptId: "3.1-c", icon: "🎥", ar: "Cinematic", en: "Cinematic", api: "Hailuo 02 Pro", cost: "$0.04/s" },
    ],
  },
  ugc: {
    labelAr: "UGC مستخدم", labelEn: "UGC Creator", icon: "🧑",
    styles: [
      { promptId: "4.1", icon: "😋", ar: "First Bite", en: "First Bite", api: "HeyGen + Kling 3.0", cost: "$3/min" },
      { promptId: "4.1-t", icon: "🔍", ar: "Texture", en: "Texture", api: "HeyGen + Kling 3.0", cost: "$3/min" },
      { promptId: "4.1-r", icon: "👍", ar: "Recommendation", en: "Recommendation", api: "HeyGen + Kling 3.0", cost: "$3/min" },
      { promptId: "4.1-f", icon: "🍴", ar: "Foodie Review", en: "Foodie Review", api: "HeyGen + Kling 3.0", cost: "$3/min" },
      { promptId: "4.1-h", icon: "🔥", ar: "High Energy", en: "High Energy", api: "HeyGen + Kling 3.0", cost: "$3/min" },
    ],
  },
  promo: {
    labelAr: "فيديو عرض", labelEn: "Promo Video", icon: "🎯",
    styles: [
      { promptId: "5.1", icon: "🎯", ar: "Creatomate 15s", en: "Creatomate 15s", api: "Creatomate", cost: "$0.07/15s" },
      { promptId: "5.2", icon: "⚛️", ar: "Remotion Lambda", en: "Remotion Lambda", api: "Remotion Lambda", cost: "$0.017/video" },
    ],
  },
};

const UGC_AGES    = ["18-25", "25-35", "35-45", "45+"];
const UGC_GENDERS = [{ ar: "ذكر", en: "Male" }, { ar: "أنثى", en: "Female" }];
const UGC_NATS    = [{ ar: "سعودي", en: "Saudi" }, { ar: "مصري", en: "Egyptian" }, { ar: "خليجي", en: "Gulf" }, { ar: "عربي", en: "Arab" }];
const UGC_LANGS   = [{ ar: "السعودية", en: "ar-SA" }, { ar: "مصر", en: "ar-EG" }, { ar: "الإمارات", en: "ar-AE" }, { ar: "English", en: "en-US" }];

// ── Video type tabs ───────────────────────────────────────────
function TypeTabs({ active, onChange }: { active: VideoType; onChange: (t: VideoType) => void }) {
  const { t } = useApp();
  return (
    <div className="flex gap-1 flex-wrap mb-5">
      {(Object.entries(VIDEO_CONFIG) as [VideoType, typeof VIDEO_CONFIG.menu][]).map(([key, cfg]) => (
        <button key={key} onClick={() => onChange(key)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all"
          style={{ background: active === key ? "var(--acs)" : "var(--b2)", borderColor: active === key ? "var(--ac)" : "var(--bd2)", color: active === key ? "var(--ac)" : "var(--c2)" }}>
          <span>{cfg.icon}</span> {t(cfg.labelAr, cfg.labelEn)}
        </button>
      ))}
    </div>
  );
}

// ── UGC extra fields ──────────────────────────────────────────
function UgcFields({ ugc, onChange }: { ugc: Record<string, string>; onChange: (k: string, v: string) => void }) {
  const { t } = useApp();
  return (
    <div className="p-3 rounded-[var(--rs)] border border-[var(--bd)] bg-[var(--b2)] mb-3 space-y-2">
      <div className="text-xs font-bold text-[var(--c2)] mb-1">UGC {t("خصائص المنشئ", "Creator Attributes")}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[var(--c2)] block mb-1">{t("العمر", "Age")}</label>
          <select value={ugc.age} onChange={(e) => onChange("age", e.target.value)}
            className="w-full bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--rx)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ac)]">
            {UGC_AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--c2)] block mb-1">{t("الجنس", "Gender")}</label>
          <select value={ugc.gender} onChange={(e) => onChange("gender", e.target.value)}
            className="w-full bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--rx)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ac)]">
            {UGC_GENDERS.map((g) => <option key={g.en} value={g.en}>{t(g.ar, g.en)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--c2)] block mb-1">{t("الجنسية", "Nationality")}</label>
          <select value={ugc.nationality} onChange={(e) => onChange("nationality", e.target.value)}
            className="w-full bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--rx)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ac)]">
            {UGC_NATS.map((n) => <option key={n.en} value={n.en}>{t(n.ar, n.en)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--c2)] block mb-1">{t("اللهجة", "Dialect")}</label>
          <select value={ugc.language} onChange={(e) => onChange("language", e.target.value)}
            className="w-full bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--rx)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ac)]">
            {UGC_LANGS.map((l) => <option key={l.en} value={l.en}>{t(l.ar, l.en)}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Video result ──────────────────────────────────────────────
function VideoResult({ item, style, vertical }: { item: any; style: StyleOption; vertical: boolean }) {
  const { t } = useApp();
  return (
    <div className="bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--r)] overflow-hidden animate-scaleIn max-w-[560px] mx-auto">
      <div className="relative flex items-center justify-center" style={{ aspectRatio: vertical ? "9/16" : "16/9", maxHeight: vertical ? 500 : 320, background: "var(--ib)" }}>
        {item?.images?.[0] && (
          <img src={item.images[0]} className="absolute inset-0 w-full h-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
        <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white/35 z-10"
          style={{ background: "rgba(255,255,255,.25)", backdropFilter: "blur(10px)", color: "#fff", fontSize: "1.4rem" }}>
          ▶
        </div>
        <div className="absolute bottom-3.5 inset-x-3.5 z-10">
          <div className="text-xs text-white/75 font-[var(--fe)] mb-0.5">{style.api} · {style.promptId}</div>
          <div className="text-base font-bold text-white">{style.ar} — {item ? t(item.nameAr, item.nameEn) : ""}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { icon: "💾", label: t("تحميل", "Download"), cls: "bg-[var(--ac)] text-black" },
            { icon: "📱", label: t("إضافة للمنيو", "Add to Menu"), cls: "bg-[var(--scs)] border border-[var(--sc)] text-[var(--sc)]" },
            { icon: "🔄", label: t("إعادة", "Regen"), cls: "bg-[var(--b2)] border border-[var(--bd2)]" },
          ].map((btn) => (
            <button key={btn.label} className={`px-4 py-2 rounded-full text-sm font-bold ${btn.cls}`}>{btn.icon} {btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function VideoStudio() {
  const { state, t } = useApp();
  const { toasts, toast } = useToast();

  const [type, setType]         = useState<VideoType>("menu");
  const [dishId, setDishId]     = useState<string>(String(state.items[0]?.id ?? ""));
  const [styleIdx, setStyleIdx] = useState(0);
  const [platform, setPlatform] = useState("instagram");
  const [ugc, setUgc]           = useState({ age: "25-35", gender: "Male", nationality: "Saudi", language: "ar-SA" });
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(false);

  const cfg    = VIDEO_CONFIG[type];
  const styles = cfg.styles;
  const sel    = styles[styleIdx] ?? styles[0];
  const item   = state.items.find((x) => String(x.id) === String(dishId));
  const isVert = type === "reel" || type === "ugc" || type === "promo";

  const setUgcField = (k: string, v: string) => setUgc((p) => ({ ...p, [k]: v }));

  const generate = () => {
    if (!item) { toast(t("اختر طبق أولاً", "Select a dish first"), "e"); return; }
    setLoading(true); setResult(false);
    toast(t(`🔸 محاكاة (${sel.api} غير مربوط)`, `🔸 Simulating (${sel.api} not connected)`), "i");
    setTimeout(() => {
      setLoading(false); setResult(true);
      toast(t("✓ محاكاة جاهزة — اربط API للإنتاج الفعلي", "✓ Simulation ready — connect API for real output"), "s");
    }, 1800);
  };

  return (
    <div className="p-4 md:p-5">
      <ToastContainer toasts={toasts} />

      {/* Type tabs */}
      <TypeTabs active={type} onChange={(v) => { setType(v); setStyleIdx(0); setResult(false); }} />

      {/* Step 1 — Dish */}
      <div className="mb-4">
        <div className="text-sm font-bold mb-2">
          1. {t("اختر الطبق", "Select Dish")}
          <span className="text-[var(--c2)] font-normal text-xs ms-2">{t("الذي سيظهر في الفيديو", "that will appear in the video")}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {state.items.slice(0, 9).map((it) => (
            <button key={it.id} onClick={() => { setDishId(String(it.id)); setResult(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--rs)] border text-start transition-all"
              style={{ background: String(dishId) === String(it.id) ? "var(--acs)" : "var(--b2)", borderColor: String(dishId) === String(it.id) ? "var(--ac)" : "var(--bd)", color: String(dishId) === String(it.id) ? "var(--ac)" : "var(--c1)" }}>
              <span className="text-xl">{it.emoji}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{t(it.nameAr, it.nameEn)}</div>
                <div className="text-[0.6rem] text-[var(--c2)] font-[var(--fe)]">{it.price} SAR</div>
              </div>
              {dishId === it.id && <span className="ms-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — Platform (reel only) */}
      {type === "reel" && cfg.platforms && (
        <div className="mb-4">
          <div className="text-sm font-bold mb-2">2. {t("المنصة", "Platform")}</div>
          <div className="flex gap-2 flex-wrap">
            {cfg.platforms.map((p) => (
              <button key={p.key} onClick={() => setPlatform(p.key)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={{ background: platform === p.key ? "var(--acs)" : "var(--b2)", borderColor: platform === p.key ? "var(--ac)" : "var(--bd)", color: platform === p.key ? "var(--ac)" : "var(--c2)" }}>
                {t(p.ar, p.en)} ({p.ratio})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2/3 — UGC fields */}
      {type === "ugc" && <UgcFields ugc={ugc} onChange={setUgcField} />}

      {/* Style selector */}
      <div className="mb-5">
        <div className="text-sm font-bold mb-2">
          {type === "reel" || type === "ugc" ? "3." : "2."} {t("ستايل الفيديو", "Video Style")}
          <span className="text-[var(--c2)] font-normal text-xs ms-2">{t("اضغط للتحديد", "click to select")}</span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {styles.map((s, i) => (
            <button key={s.promptId} onClick={() => { setStyleIdx(i); setResult(false); }}
              className="p-3 text-center rounded-[var(--rs)] border-2 relative transition-all"
              style={{ background: styleIdx === i ? "var(--acs)" : "var(--b1)", borderColor: styleIdx === i ? "var(--ac)" : "var(--bd2)" }}>
              <span className="absolute top-1 end-1 text-[0.52rem] px-1.5 py-0.5 rounded-[var(--rx)] bg-[var(--acs)] text-[var(--ac)] font-bold font-[var(--fe)]">
                {s.promptId}
              </span>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xs font-bold">{t(s.ar, s.en)}</div>
              <div className="text-[0.56rem] text-[var(--c3)] font-[var(--fe)] mt-0.5">{s.api}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt / API info strip */}
      <div className="p-3 rounded-[var(--rs)] mb-4 flex flex-wrap gap-2.5 items-center text-xs"
        style={{ background: "var(--pps)", border: "1px solid rgba(167,139,250,.2)" }}>
        <span className="font-bold text-[var(--pp)]">🤖 {sel.promptId}</span>
        <span className="text-[var(--c2)]">🔌 {sel.api}</span>
        <span className="text-[var(--c2)]">💰 {sel.cost}</span>
        <span className="ms-auto px-2 py-0.5 rounded-full text-[0.62rem] font-bold"
          style={{ background: "rgba(248,113,113,.1)", color: "var(--dg)", border: "1px solid rgba(248,113,113,.2)" }}>
          {t("محاكاة", "Simulation")}
        </span>
      </div>

      {/* Generate button */}
      <div className="flex gap-3 items-center mb-5">
        <button onClick={generate} disabled={loading}
          className="px-7 py-3 rounded-full font-extrabold text-[0.9rem] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,var(--ac),var(--ac2))", color: "#000", boxShadow: "0 4px 14px rgba(255,180,50,.25)" }}>
          {loading ? `⏳ ${t("يعمل…", "Processing…")}` : `🎬 ${t("توليد الفيديو", "Generate Video")}`}
        </button>
        <span className="text-sm text-[var(--c2)] font-[var(--fe)]">{sel.cost}</span>
      </div>

      {/* Result */}
      {result && !loading && (
        <VideoResult item={item} style={sel} vertical={isVert} />
      )}
    </div>
  );
}
