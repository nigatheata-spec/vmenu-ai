"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/lib/context";
import { Card } from "@/components/shared/ui";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/shared/ui";

type PStyle = "commercial" | "editorial" | "rustic" | "minimal";
type PsTab = "new" | "gal";

const STYLES: { key: PStyle; icon: string; labelAr: string; labelEn: string }[] = [
  { key: "commercial", icon: "✨", labelAr: "تجاري", labelEn: "Commercial" },
  { key: "editorial",  icon: "📰", labelAr: "تحريري", labelEn: "Editorial" },
  { key: "rustic",     icon: "🪵", labelAr: "ريفي",   labelEn: "Rustic" },
  { key: "minimal",   icon: "⬜", labelAr: "بسيط",  labelEn: "Minimal" },
];

const CSS_FILTERS: Record<PStyle, string> = {
  commercial: "brightness(1.15) saturate(1.35) contrast(1.12)",
  editorial:  "brightness(1.05) saturate(1.2) contrast(1.25)",
  rustic:     "brightness(1.1) saturate(1.15) contrast(1.05) sepia(.12)",
  minimal:    "brightness(1.2) saturate(1.1) contrast(1.05)",
};

function applyFilterToImage(dataUrl: string, filter: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width  = Math.min(img.width, 1280);
      cv.height = Math.round((img.height / img.width) * cv.width);
      const ctx = cv.getContext("2d")!;
      ctx.filter = filter;
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
}

// ── Upload area ───────────────────────────────────────────────
function UploadZone({ onFiles, disabled }: { onFiles: (files: FileList) => void; disabled: boolean }) {
  const { t } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef  = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => fileRef.current?.click()}
      className="border-2 border-dashed border-[var(--bd2)] rounded-[var(--r)] p-10 text-center cursor-pointer
                 bg-[var(--b1)] transition-all hover:border-[var(--ac)] hover:bg-[var(--acs)] select-none"
    >
      <div className="text-4xl mb-2.5 opacity-60">📷</div>
      <div className="text-[0.95rem] font-bold mb-1">{t("ارفع صور الطبق", "Upload Dish Photos")}</div>
      <div className="text-sm text-[var(--c2)] mb-3.5">{t("3 صور كحد أقصى · JPG / PNG", "Max 3 photos · JPG / PNG")}</div>
      <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-5 py-2 rounded-full bg-[var(--ac)] text-black font-semibold text-sm"
        >
          📁 {t("ملف", "File")}
        </button>
        <button
          onClick={() => camRef.current?.click()}
          className="px-5 py-2 rounded-full bg-[var(--b2)] border border-[var(--bd2)] font-semibold text-sm"
        >
          📸 {t("كاميرا", "Camera")}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)} />
    </div>
  );
}

// ── Add to menu modal ─────────────────────────────────────────
function AddToMenuModal({ imgUrl, onClose }: { imgUrl: string; onClose: () => void }) {
  const { state, dispatch, t } = useApp();
  const [selection, setSelection] = useState<"existing" | "new">("existing");
  const [selItemId, setSelItemId] = useState<string>(String(state.items[0]?.id ?? ""));
  const [newName, setNewName] = useState("");

  const confirm = () => {
    if (selection === "existing") {
      const it = state.items.find((x) => String(x.id) === selItemId);
      if (!it) return;
      dispatch({
        type: "SET_ITEMS",
        payload: state.items.map((i) => String(i.id) === selItemId ? { ...i, images: [imgUrl, ...i.images] } : i),
      });
    } else {
      if (!newName.trim()) return;
      dispatch({
        type: "SET_ITEMS",
        payload: [...state.items, {
          id: String(Date.now()), categoryId: state.categories[0]?.id ?? "",
          emoji: "🍽️", nameAr: newName, nameEn: newName,
          descAr: "", descEn: "", price: 0, badge: "", available: true, images: [imgUrl],
        }],
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--ov)] flex items-center justify-center p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[420px] bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--r)] overflow-hidden animate-scaleIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd)]">
          <span className="font-extrabold text-base">📸 {t("إضافة للمنيو", "Add to Menu")}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[var(--b2)] flex items-center justify-center text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <img src={imgUrl} alt="result" className="w-full rounded-[var(--rs)] max-h-40 object-cover" />
          <div className="flex gap-2">
            <button onClick={() => setSelection("existing")}
              className="flex-1 py-2 rounded-[var(--rs)] text-sm font-semibold border transition-all"
              style={{ background: selection === "existing" ? "var(--acs)" : "var(--b2)", borderColor: selection === "existing" ? "var(--ac)" : "var(--bd)", color: selection === "existing" ? "var(--ac)" : "var(--c2)" }}>
              {t("طبق موجود", "Existing Dish")}
            </button>
            <button onClick={() => setSelection("new")}
              className="flex-1 py-2 rounded-[var(--rs)] text-sm font-semibold border transition-all"
              style={{ background: selection === "new" ? "var(--acs)" : "var(--b2)", borderColor: selection === "new" ? "var(--ac)" : "var(--bd)", color: selection === "new" ? "var(--ac)" : "var(--c2)" }}>
              {t("طبق جديد", "New Dish")}
            </button>
          </div>
          {selection === "existing" ? (
            <select value={selItemId} onChange={(e) => setSelItemId(e.target.value)}
              className="w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)] px-3 py-2 text-sm outline-none focus:border-[var(--ac)]">
              {state.items.map((it) => <option key={it.id} value={it.id}>{it.emoji} {t(it.nameAr, it.nameEn)}</option>)}
            </select>
          ) : (
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder={t("اسم الطبق الجديد", "New dish name")}
              className="w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)] px-3 py-2 text-sm outline-none focus:border-[var(--ac)]" />
          )}
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-[var(--bd)]">
          <button onClick={confirm} className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--sc)] text-white font-bold text-sm">
            ✓ {t("تأكيد الإضافة", "Confirm Add")}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd2)] text-sm font-semibold">
            {t("إلغاء", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Enhancement Tab ───────────────────────────────────────
function NewEnhancement() {
  const { state, t } = useApp();
  const { toasts, toast } = useToast();
  const [photos, setPhotos] = useState<string[]>([]);
  const [style, setStyle] = useState<PStyle>("commercial");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addMenuImg, setAddMenuImg] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .forEach((f) => {
        if (photos.length >= 3) return;
        const r = new FileReader();
        r.onload = (e) => {
          if (e.target?.result) setPhotos((p) => [...p, e.target!.result as string].slice(0, 3));
        };
        r.readAsDataURL(f);
      });
  }, [photos.length]);

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const enhance = async () => {
    if (!photos.length) { toast(t("ارفع صورة أولاً", "Upload a photo first"), "e"); return; }
    setLoading(true);
    setResult(null);
    toast(t("⏳ Gemini AI يعمل (محاكاة)…", "⏳ Gemini AI processing (simulation)…"), "i");
    try {
      const out = await applyFilterToImage(photos[0], CSS_FILTERS[style]);
      setResult(out);
      toast(t("✓ محاكاة جاهزة — اربط Gemini API للإنتاج الفعلي", "✓ Simulation ready — connect Gemini for real output"), "s");
    } catch {
      toast(t("⚠️ خطأ في المعالجة", "⚠️ Processing error"), "e");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} />

      {/* Upload zone */}
      <UploadZone onFiles={handleFiles} disabled={photos.length >= 3} />

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative w-[110px] h-[110px] rounded-[var(--rs)] overflow-hidden border-2 border-[var(--bd2)]">
              <img src={p} className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[0.6rem] flex items-center justify-center">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Style selector + enhance button */}
      {photos.length > 0 && (
        <div>
          <div className="text-sm font-bold mb-2">{t("اختر النمط", "Choose Style")}</div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {STYLES.map((s, i) => (
              <button key={s.key} onClick={() => setStyle(s.key)}
                className="p-3 text-center rounded-[var(--rs)] border-2 transition-all"
                style={{ background: style === s.key ? "var(--acs)" : "var(--b1)", borderColor: style === s.key ? "var(--ac)" : "var(--bd2)" }}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-bold">{t(s.labelAr, s.labelEn)}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <button onClick={enhance} disabled={loading}
              className="px-7 py-2.5 rounded-full font-extrabold text-sm disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,var(--ac),var(--ac2))", color: "#000", boxShadow: "0 4px 16px rgba(255,180,50,.25)" }}>
              {loading ? "⏳ …" : `✨ ${t("تحسين بالـ AI", "Enhance with AI")}`}
            </button>
            <span className="text-xs text-[var(--c2)] font-[var(--fe)]">~$0.04</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="animate-fadeUp">
          <h3 className="text-center text-base font-extrabold mb-2">
            {t("النتيجة", "Result")} 🔸 {t("محاكاة", "Simulation")}
          </h3>
          <div className="max-w-[520px] mx-auto mb-3 px-3 py-2 rounded-[var(--rs)] border border-[var(--wr)] text-xs text-[var(--wr)] text-center"
            style={{ background: "var(--wrs)" }}>
            ⚠️ {t("اربط Gemini API في الإعدادات للإنتاج الفعلي", "Connect Gemini API in Settings for real output")}
          </div>
          <div className="max-w-[520px] mx-auto">
            <img src={result} className="w-full rounded-[var(--r)] border border-[var(--bd2)]" />
          </div>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <button onClick={() => setAddMenuImg(result)}
              className="px-5 py-2.5 rounded-full bg-[var(--sc)] text-white font-bold text-sm">
              ✓ {t("إضافة للمنيو", "Add to Menu")}
            </button>
            <button onClick={enhance}
              className="px-5 py-2.5 rounded-full font-bold text-sm border"
              style={{ background: "var(--wrs)", borderColor: "var(--wr)", color: "var(--wr)" }}>
              🔄 {t("إعادة", "Regen")}
            </button>
            <button onClick={() => setResult(null)}
              className="px-5 py-2.5 rounded-full font-bold text-sm border"
              style={{ background: "var(--dgs)", borderColor: "var(--dg)", color: "var(--dg)" }}>
              ✕ {t("رفض", "Decline")}
            </button>
          </div>
        </div>
      )}

      {addMenuImg && <AddToMenuModal imgUrl={addMenuImg} onClose={() => { setAddMenuImg(null); setResult(null); setPhotos([]); }} />}
    </div>
  );
}

// ── Gallery Tab ───────────────────────────────────────────────
function GalleryTab() {
  const { state, dispatch, t } = useApp();
  const withImgs = state.items.filter((i) => i.images?.length > 0);

  if (!withImgs.length) {
    return (
      <div className="text-center py-14">
        <div className="text-5xl mb-3">📸</div>
        <div className="text-sm text-[var(--c3)]">{t("لا صور بعد", "No photos yet")}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
      {withImgs.map((it) => (
        <Card key={it.id} hover className="overflow-hidden">
          <div className="w-full aspect-square overflow-hidden">
            <img src={it.images[0]} className="w-full h-full object-cover" />
          </div>
          <div className="p-2.5">
            <div className="text-sm font-bold">{t(it.nameAr, it.nameEn)}</div>
            <div className="text-xs text-[var(--ac)] font-bold font-[var(--fe)]">{it.price} SAR</div>
            <div className="text-[0.64rem] text-[var(--c2)] mt-0.5">{it.images.length} {t("صورة", "photo(s)")}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function PhotoStudio() {
  const { state, t } = useApp();
  const [tab, setTab] = useState<PsTab>("new");
  const withImgs = state.items.filter((i) => i.images?.length > 0).length;

  const tabCls = (active: boolean) =>
    `px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
      active ? "text-[var(--ac)] border-[var(--ac)]" : "text-[var(--c2)] border-transparent hover:text-[var(--c1)]"
    }`;

  return (
    <div className="p-4 md:p-5">
      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b-2 border-[var(--bd)]">
        <button onClick={() => setTab("new")} className={tabCls(tab === "new")}>
          {t("تحسين جديد", "New Enhancement")}
        </button>
        <button onClick={() => setTab("gal")} className={tabCls(tab === "gal")}>
          {t("المعرض", "Gallery")} ({withImgs})
        </button>
      </div>

      {tab === "new" ? <NewEnhancement /> : <GalleryTab />}
    </div>
  );
}
