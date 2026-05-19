"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/context";
import { Input, Toggle } from "@/components/shared/ui";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/shared/ui";
import StaffManager from "@/components/settings/StaffManager";

type SetTab = "profile" | "team" | "apis" | "prompts" | "general";

// ── Default data ──────────────────────────────────────────────
interface StaffMember { id: number; name: string; email: string; role: string; active: boolean }
interface ApiEntry { key: string; name: string; cat: string; descAr: string; descEn: string; icon: string; cost: string; connected: boolean; credit: string; docs: string }
interface PromptEntry { id: string; cat: string; titleAr: string; titleEn: string; api: string; cost: string; active: boolean; prompt: string; vars: string[] }

const DEFAULT_STAFF: StaffMember[] = [
  { id: 1, name: "Ahmad Al-Saud", email: "ahmad@mgr.com", role: "manager", active: true },
  { id: 2, name: "Fatima", email: "fatima@kitchen.com", role: "kitchen", active: true },
  { id: 3, name: "Khalid", email: "khalid@waiter.com", role: "waiter", active: true },
];

const DEFAULT_APIS: ApiEntry[] = [
  { key: "gemini_image", name: "Gemini 2.5 Flash Image", cat: "photo", descAr: "تحسين الصور الأساسي", descEn: "Primary photo enhancement", icon: "🖼️", cost: "$0.04/img", connected: true, credit: "$4.20", docs: "https://ai.google.dev" },
  { key: "flux", name: "FLUX.1 Kontext Pro", cat: "photo", descAr: "تحسين الصور (بديل)", descEn: "Photo enhancement (fallback)", icon: "🎨", cost: "$0.04/img", connected: false, credit: "", docs: "https://fal.ai" },
  { key: "kling26", name: "Kling 2.6 Pro", cat: "video_menu", descAr: "فيديو Dark Cinematic", descEn: "Dark Cinematic videos", icon: "🌑", cost: "$0.56/10s", connected: true, credit: "$12.50", docs: "https://fal.ai" },
  { key: "veo31", name: "Google Veo 3.1 Fast", cat: "video_menu", descAr: "فيديو Light Cinematic", descEn: "Light Cinematic", icon: "☀️", cost: "$0.50/10s", connected: false, credit: "", docs: "https://ai.google.dev" },
  { key: "seedance", name: "Seedance 2.0 Pro", cat: "video_menu", descAr: "فيديو Splitting", descEn: "Splitting videos", icon: "🔪", cost: "$0.47/10s", connected: true, credit: "$8.30", docs: "https://fal.ai" },
  { key: "hailuo", name: "MiniMax Hailuo 02 Pro", cat: "video_reel", descAr: "ريلز سوشيال", descEn: "Social reels", icon: "📱", cost: "$0.04/s", connected: true, credit: "$6.10", docs: "https://fal.ai" },
  { key: "heygen", name: "HeyGen Avatar IV", cat: "ugc", descAr: "UGC Talking Head", descEn: "UGC Talking Head", icon: "🧑", cost: "$3/min", connected: true, credit: "82 min", docs: "https://docs.heygen.com" },
  { key: "creatomate", name: "Creatomate", cat: "promo", descAr: "فيديو العروض", descEn: "Promo videos", icon: "🎯", cost: "$0.07/15s", connected: true, credit: "$15.00", docs: "https://creatomate.com" },
  { key: "claude_sonnet", name: "Claude Sonnet 4.5", cat: "ai", descAr: "تحليل العروض", descEn: "AI promo analysis", icon: "🤖", cost: "$3/$15 /1M", connected: true, credit: "$9.70", docs: "https://docs.claude.com" },
  { key: "claude_haiku", name: "Claude Haiku 4.5", cat: "ai", descAr: "تصنيف + وصف", descEn: "Classify + describe", icon: "⚡", cost: "$1/$5 /1M", connected: true, credit: "$2.15", docs: "https://docs.claude.com" },
];

const DEFAULT_PROMPTS: PromptEntry[] = [
  { id: "1.1", cat: "photo", titleAr: "تحسين الصور (أساسي)", titleEn: "Photo Enhancement (Primary)", api: "Gemini 2.5 Flash Image", cost: "$0.039", active: true, vars: ["image_base64", "aspect_ratio", "style_preset"], prompt: "Enhance this food photograph into a professional, high-fidelity image.\n\nCRITICAL RULES — DO NOT VIOLATE:\n1. PRESERVE the EXACT composition: same plate, same food items, same garnish placement.\n2. DO NOT add, remove, or modify ANY food element.\n3. DO NOT change the type of dish.\n\nENHANCE ONLY: lighting, color grading, textures, background, depth of field, steam/moisture.\n\nOutput: {aspect_ratio}, sRGB, 4K professional food photography." },
  { id: "2.1", cat: "video_menu", titleAr: "Dark Cinematic", titleEn: "Dark Cinematic", api: "Kling 2.6 Pro", cost: "$0.56/10s", active: true, vars: ["image_url", "duration", "aspect_ratio"], prompt: "Cinematic food commercial in a dark, moody atmosphere. Camera slowly orbits the dish at 45 degrees, revealing dramatic low-key lighting with deep shadows and warm amber rim lights. Realistic wispy steam rises gently.\n\nCamera choreography:\n- 0-3s: Slow 45° orbit\n- 3-6s: Top-down flat-lay\n- 6-10s: Extreme macro push-in\n\nMood: Luxurious, mysterious. 4K, 24fps." },
  { id: "3.1", cat: "video_reel", titleAr: "ريلز سوشيال", titleEn: "Social Reel", api: "Hailuo 02 Pro", cost: "$0.04/s", active: true, vars: ["image_url", "dish_name", "platform", "style"], prompt: "Social media food reel for {dish_name}. {orientation}.\n\nStyles:\n- energetic: Fast-paced, quick zoom-ins, dramatic drop-in.\n- aesthetic: Slow dreamy showcase, ethereal soft focus.\n- asmr: Ultra close-up macro, maximum texture.\n- cinematic: Dramatic lighting shift, smooth dolly.\n\nNo text overlays. Optimized for {platform}. 4K." },
  { id: "4.1", cat: "ugc", titleAr: "UGC Talking Head", titleEn: "UGC Talking Head", api: "HeyGen Avatar IV", cost: "$3/min", active: true, vars: ["script_text", "style", "age", "gender", "nationality", "language"], prompt: "Generate talking head video with HeyGen Avatar IV.\n\nAvatar: {age}-year-old {nationality} {gender}\nVoice: {language} native\nDimension: 1080×1920 (9:16 vertical)" },
  { id: "5.1", cat: "promo", titleAr: "فيديو عرض 15 ثانية", titleEn: "Promo Video 15s", api: "Creatomate", cost: "$0.07", active: true, vars: ["product_image_url", "product_name", "shots", "total_duration"], prompt: "JSON template for Creatomate. 5 shots max, each 3 seconds.\n\nEach shot: text, text_anim, font, font_color, bg_color, duration_s\n\nOutput: 1080×1920 MP4, 30fps, 15s total." },
  { id: "6.1", cat: "ai", titleAr: "تحليل العروض الأسبوعي", titleEn: "Weekly Promo Analysis", api: "Claude Sonnet 4.5", cost: "$0.065", active: true, vars: ["venue_id"], prompt: "You are a restaurant revenue optimization AI. Analyze sales data and suggest data-driven promotional offers.\n\nPromo Strategy Types: BUNDLE, HAPPY_HOUR, WEATHER, EVENT, WINBACK, UPSELL\n\nGuardrails:\n- Max single-item discount: 25%\n- Max bundle discount: 30%\n- Never promote items with food_cost_pct > 40%\n\nSuggest 3-5 promos. Prioritize by revenue impact." },
];

const ROLE_MAP: Record<string, { ar: string; en: string; color: string }> = {
  manager: { ar: "مدير", en: "Manager", color: "var(--ac)" },
  kitchen:  { ar: "مطبخ", en: "Kitchen",  color: "var(--sc)" },
  waiter:   { ar: "نادل", en: "Waiter",   color: "var(--in)" },
};

// ── Sidebar nav ───────────────────────────────────────────────
function SettingsNav({ active, onChange }: { active: SetTab; onChange: (t: SetTab) => void }) {
  const { t } = useApp();
  const tabs: { key: SetTab; icon: string; ar: string; en: string }[] = [
    { key: "profile",  icon: "🏪", ar: "المطعم",          en: "Restaurant" },
    { key: "team",     icon: "👥", ar: "الفريق (RBAC)",    en: "Team (RBAC)" },
    { key: "apis",     icon: "🔌", ar: "APIs",              en: "APIs" },
    { key: "prompts",  icon: "🤖", ar: "برومبتات AI",       en: "AI Prompts" },
    { key: "general",  icon: "⚙️", ar: "عام",              en: "General" },
  ];
  return (
    <nav className="w-[200px] flex-shrink-0 border-e border-[var(--bd)] py-2">
      {tabs.map((tab) => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-e-[3px] transition-all"
          style={{
            color: active === tab.key ? "var(--ac)" : "var(--c2)",
            background: active === tab.key ? "var(--acs)" : "transparent",
            borderRightColor: active === tab.key ? "var(--ac)" : "transparent",
            fontWeight: active === tab.key ? "600" : "400",
          }}>
          {tab.icon} {t(tab.ar, tab.en)}
        </button>
      ))}
    </nav>
  );
}

// ── Profile tab ───────────────────────────────────────────────
function ProfileTab() {
  const { state, dispatch, t } = useApp();
  const { toasts, toast } = useToast();
  const auth = state.auth!;

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <div className="text-lg font-extrabold mb-1">🏪 {t("معلومات المطعم", "Restaurant Profile")}</div>
      <div className="text-sm text-[var(--c2)] mb-5">{t("المعلومات الأساسية للمطعم", "Basic restaurant information")}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {[
          { label: t("اسم المطعم", "Restaurant Name"), val: auth.resto, field: "resto", disabled: false },
          { label: `Slug (${t("رابط QR", "QR URL")})`, val: auth.slug, field: "slug", disabled: true },
          { label: t("الجوال", "Phone"), val: auth.phone, field: "phone", disabled: false },
          { label: t("البريد", "Email"), val: auth.email, field: "email", disabled: true },
        ].map(({ label, val, field, disabled }) => (
          <div key={field}>
            <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{label}</label>
            <Input value={val ?? ""} disabled={disabled}
              onChange={(e) => dispatch({ type: "SET_AUTH", payload: { ...auth, [field]: e.target.value } as any })}
              className={disabled ? "opacity-60 cursor-not-allowed" : ""}
              dir={["phone", "slug", "email"].includes(field) ? "ltr" : undefined}
              style={["phone", "slug", "email"].includes(field) ? { textAlign: "left" } : undefined}
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("المدينة", "City")}</label>
          <Input value={auth.city ?? ""} onChange={(e) => dispatch({ type: "SET_AUTH", payload: { ...auth, city: e.target.value } as any })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("عدد الطاولات", "Tables")}</label>
          <Input type="number" value={auth.tables} dir="ltr" style={{ textAlign: "left" }}
            onChange={(e) => dispatch({ type: "SET_AUTH", payload: { ...auth, tables: parseInt(e.target.value) || auth.tables } as any })} />
        </div>
      </div>
      <button onClick={() => toast(t("✓ تم الحفظ", "✓ Saved"), "s")}
        className="px-6 py-2 rounded-full bg-[var(--ac)] text-black font-bold text-sm mt-2">
        💾 {t("حفظ", "Save")}
      </button>
    </div>
  );
}

// ── Team tab ──────────────────────────────────────────────────
function TeamTab() {
  const { state } = useApp();
  // Use the role from the auth context; default to "owner" if not set
  const role = (state.auth as any)?.role ?? "owner";
  return <StaffManager userRole={role} />;
}

// ── APIs tab ──────────────────────────────────────────────────
const API_CAT_LABELS: Record<string, { ar: string; en: string }> = {
  photo:      { ar: "📸 تحسين الصور", en: "📸 Photo" },
  video_menu: { ar: "🎬 فيديو المنيو", en: "🎬 Menu Video" },
  video_reel: { ar: "📱 ريلز", en: "📱 Reels" },
  ugc:        { ar: "🧑 UGC", en: "🧑 UGC" },
  promo:      { ar: "🎯 عروض", en: "🎯 Promo" },
  ai:         { ar: "🤖 AI", en: "🤖 AI" },
};

function ApiCard({ api, onConnect }: { api: ApiEntry; onConnect: (key: string) => void }) {
  const { t } = useApp();
  return (
    <div className={`flex items-center gap-3 px-3.5 py-3 rounded-[var(--rs)] border transition-all ${api.connected ? "bg-[var(--scs)] border-[var(--sc)]" : "bg-[var(--b2)] border-[var(--bd)]"}`}>
      <span className="text-2xl flex-shrink-0">{api.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{api.name}</div>
        <div className="text-xs text-[var(--c2)]">{t(api.descAr, api.descEn)}</div>
        <div className="text-[0.62rem] font-[var(--fe)] mt-0.5">
          💰 {api.cost}
          {api.connected && api.credit && <span className="ms-2 text-[var(--sc)]">💳 {api.credit}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0 items-end">
        <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold ${api.connected ? "bg-[var(--sc)] text-white" : "bg-[var(--b3)] text-[var(--c2)]"}`}>
          {api.connected ? t("مربوط", "Connected") : t("غير مربوط", "Not connected")}
        </span>
        <button onClick={() => onConnect(api.key)}
          className="text-[0.68rem] px-2.5 py-1 rounded-[var(--rx)] border font-semibold transition-all"
          style={{ borderColor: "var(--ac)", color: "var(--ac)", background: "var(--acs)" }}>
          {api.connected ? t("إدارة", "Manage") : t("ربط", "Connect")}
        </button>
      </div>
    </div>
  );
}

function ApisTab() {
  const { t } = useApp();
  const { toasts, toast } = useToast();
  const [apis, setApis] = useState<ApiEntry[]>(DEFAULT_APIS);

  const handleConnect = (key: string) => {
    setApis((p) => p.map((a) => a.key === key ? { ...a, connected: !a.connected } : a));
    const api = apis.find((a) => a.key === key);
    toast(api?.connected ? t("✓ تم الفصل", "✓ Disconnected") : t("✓ تم الربط", "✓ Connected"), "s");
  };

  const cats = [...new Set(apis.map((a) => a.cat))];

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <div className="text-lg font-extrabold mb-1">🔌 {t("إدارة APIs", "API Management")}</div>
      <div className="text-sm text-[var(--c2)] mb-5">{t("ربط خدمات AI الخارجية", "Connect external AI services")}</div>

      <div className="space-y-5">
        {cats.map((cat) => {
          const catApis = apis.filter((a) => a.cat === cat);
          const lbl = API_CAT_LABELS[cat] ?? { ar: cat, en: cat };
          return (
            <div key={cat}>
              <div className="text-sm font-bold mb-2 text-[var(--c2)]">{t(lbl.ar, lbl.en)}</div>
              <div className="space-y-2">
                {catApis.map((api) => <ApiCard key={api.key} api={api} onConnect={handleConnect} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Prompts tab ───────────────────────────────────────────────
function PromptCard({ prompt, onEdit }: { prompt: PromptEntry; onEdit: (p: PromptEntry) => void }) {
  const { t } = useApp();
  return (
    <div className="bg-[var(--b2)] border border-[var(--bd)] rounded-[var(--rs)] p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold font-[var(--fe)] text-[var(--ac)]">{prompt.id}</span>
          <span className="text-sm font-bold">{t(prompt.titleAr, prompt.titleEn)}</span>
          <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-bold ${prompt.active ? "bg-[var(--scs)] text-[var(--sc)]" : "bg-[var(--b3)] text-[var(--c3)]"}`}>
            {prompt.active ? t("نشط", "Active") : t("معطل", "Disabled")}
          </span>
        </div>
        <div className="text-[0.68rem] text-[var(--c2)] font-[var(--fe)]">🔌 {prompt.api} · 💰 {prompt.cost}</div>
        {prompt.vars.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {prompt.vars.map((v) => (
              <span key={v} className="px-2 py-0.5 rounded-full text-[0.58rem] font-[var(--fc)] border"
                style={{ background: "var(--pps)", color: "var(--pp)", borderColor: "rgba(167,139,250,.3)" }}>
                {`{${v}}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => onEdit(prompt)}
        className="px-3 py-1.5 rounded-[var(--rx)] text-xs font-semibold border flex-shrink-0"
        style={{ background: "var(--pps)", borderColor: "rgba(167,139,250,.3)", color: "var(--pp)" }}>
        ✏️ {t("تعديل", "Edit")}
      </button>
    </div>
  );
}

function PromptModal({ prompt, onClose, onSave }: { prompt: PromptEntry; onClose: () => void; onSave: (p: PromptEntry) => void }) {
  const { t } = useApp();
  const [text, setText] = useState(prompt.prompt);
  const [active, setActive] = useState(prompt.active);

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--ov)] flex items-center justify-center p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[720px] bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--r)] flex flex-col max-h-[90vh] animate-scaleIn overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd)]">
          <span className="font-extrabold flex items-center gap-2">🤖 {prompt.id}: {t(prompt.titleAr, prompt.titleEn)}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[var(--b2)] flex items-center justify-center text-sm">✕</button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "🔌 API", val: prompt.api },
              { label: "💰 Cost", val: prompt.cost },
            ].map(({ label, val }) => (
              <div key={label} className="px-3 py-2 bg-[var(--b2)] rounded-[var(--rs)] text-xs">
                <span className="text-[var(--c2)]">{label}:</span> <b className="font-[var(--fe)]">{val}</b>
              </div>
            ))}
          </div>
          {prompt.vars.length > 0 && (
            <div>
              <div className="text-xs font-bold mb-2">🔧 {t("المتغيرات", "Variables")}</div>
              <div className="flex gap-1 flex-wrap">
                {prompt.vars.map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded-full text-xs font-[var(--fc)] border"
                    style={{ background: "var(--pps)", color: "var(--pp)", borderColor: "rgba(167,139,250,.3)" }}>
                    {`{${v}}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("نشط", "Active")}</span>
            <Toggle checked={active} onChange={setActive} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold">{t("نص البرومبت", "Prompt Content")}</label>
              <button onClick={() => navigator.clipboard.writeText(text)}
                className="text-xs px-2 py-1 rounded-[var(--rx)] bg-[var(--b2)] border border-[var(--bd2)]">
                📋 {t("نسخ", "Copy")}
              </button>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14}
              className="w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)] px-3 py-2 text-xs font-[var(--fc)] outline-none focus:border-[var(--ac)] resize-none leading-relaxed"
              dir="ltr" style={{ textAlign: "left" }} />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-[var(--bd)]">
          <button onClick={() => onSave({ ...prompt, prompt: text, active })}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--ac)] text-black font-bold text-sm">
            💾 {t("حفظ التعديلات", "Save Edits")}
          </button>
          <button onClick={() => { setText(DEFAULT_PROMPTS.find((p) => p.id === prompt.id)?.prompt ?? text); }}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd2)] text-sm font-semibold">
            🔄 {t("استعادة الافتراضي", "Reset Default")}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd2)] text-sm font-semibold">
            {t("إلغاء", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptsTab() {
  const { t } = useApp();
  const { toasts, toast } = useToast();
  const [prompts, setPrompts] = useState<PromptEntry[]>(DEFAULT_PROMPTS);
  const [editing, setEditing] = useState<PromptEntry | null>(null);

  const cats = [...new Set(prompts.map((p) => p.cat))];
  const catLabels: Record<string, string> = {
    photo: "📸", video_menu: "🎬", video_reel: "📱", ugc: "🧑", promo: "🎯", ai: "🤖", quality: "✅",
  };

  const save = (updated: PromptEntry) => {
    setPrompts((p) => p.map((x) => x.id === updated.id ? updated : x));
    setEditing(null);
    toast(t("✓ تم حفظ البرومبت", "✓ Prompt saved"), "s");
  };

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <div className="text-lg font-extrabold mb-1">🤖 {t("برومبتات الذكاء الاصطناعي", "AI Prompts")}</div>
      <div className="text-sm text-[var(--c2)] mb-5">{t("عرض وتعديل كل برومبت", "View and edit every prompt")}</div>
      <div className="space-y-5">
        {cats.map((cat) => {
          const catPrompts = prompts.filter((p) => p.cat === cat);
          return (
            <div key={cat}>
              <div className="text-sm font-bold mb-2 text-[var(--c2)]">{catLabels[cat] ?? ""} {cat.toUpperCase()}</div>
              <div className="space-y-2">
                {catPrompts.map((p) => <PromptCard key={p.id} prompt={p} onEdit={setEditing} />)}
              </div>
            </div>
          );
        })}
      </div>
      {editing && <PromptModal prompt={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

// ── General tab ───────────────────────────────────────────────
function GeneralTab() {
  const { state, dispatch, t } = useApp();
  const { toasts, toast } = useToast();
  const { settings } = state;

  const rows: { key: keyof typeof settings; ar: string; en: string }[] = [
    { key: "audioAlerts", ar: "تنبيهات صوتية للطلبات الجديدة", en: "Audio alerts for new orders" },
    { key: "apiWarn",     ar: "تحذيرات API عند انخفاض الرصيد", en: "API credit low warnings" },
    { key: "weeklyEmail", ar: "تقرير أسبوعي على البريد",       en: "Weekly email report" },
    { key: "autoPromos",  ar: "توليد عروض تلقائي أسبوعياً",    en: "Auto-generate weekly promos" },
  ];

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <div className="text-lg font-extrabold mb-1">⚙️ {t("الإعدادات العامة", "General Settings")}</div>
      <div className="text-sm text-[var(--c2)] mb-5">{t("تفضيلات النظام", "System preferences")}</div>

      <div className="space-y-3 mb-5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between px-4 py-3 bg-[var(--b2)] rounded-[var(--rs)] border border-[var(--bd)]">
            <span className="text-sm">{t(r.ar, r.en)}</span>
            <Toggle checked={!!settings[r.key]}
              onChange={(v) => dispatch({ type: "SET_SETTINGS", payload: { [r.key]: v } })} />
          </div>
        ))}
        <div className="px-4 py-3 bg-[var(--b2)] rounded-[var(--rs)] border border-[var(--bd)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">{t("الحد الأقصى للخصم", "Max discount %")}</span>
            <span className="font-bold font-[var(--fe)] text-[var(--ac)]">{settings.maxDiscount}%</span>
          </div>
          <input type="range" min={5} max={50} step={5} value={settings.maxDiscount}
            onChange={(e) => dispatch({ type: "SET_SETTINGS", payload: { maxDiscount: Number(e.target.value) } })}
            className="w-full accent-[var(--ac)]" />
          <div className="flex justify-between text-[0.65rem] text-[var(--c3)] mt-1">
            <span>5%</span><span>25%</span><span>50%</span>
          </div>
        </div>
      </div>

      <button onClick={() => toast(t("✓ تم الحفظ", "✓ Saved"), "s")}
        className="px-6 py-2 rounded-full bg-[var(--ac)] text-black font-bold text-sm">
        💾 {t("حفظ", "Save")}
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function SettingsView() {
  const [tab, setTab] = useState<SetTab>("profile");

  return (
    <div className="p-4 md:p-5">
      <div className="flex bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] overflow-hidden"
        style={{ minHeight: 500 }}>
        <SettingsNav active={tab} onChange={setTab} />
        <div className="flex-1 p-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
          {tab === "profile"  && <ProfileTab />}
          {tab === "team"     && <TeamTab />}
          {tab === "apis"     && <ApisTab />}
          {tab === "prompts"  && <PromptsTab />}
          {tab === "general"  && <GeneralTab />}
        </div>
      </div>
    </div>
  );
}
