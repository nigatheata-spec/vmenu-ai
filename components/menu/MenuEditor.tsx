"use client";

// =============================================================
// Vmenu.ai — MenuEditor
//
// What changed from the dummy-data version
// -----------------------------------------
// 1. useMenuData() replaces hardcoded state.items / state.categories.
//    Items and categories are fetched from the real API on mount,
//    then synced into the global AppContext via dispatch.
// 2. Full loading state: skeleton preview + skeleton editor panels.
// 3. Full error state: inline retry banner with bilingual message.
// 4. Mutations (save / delete) call the API client and call
//    refetch() on success so the panel stays in sync.
// 5. UI is pixel-identical to the previous version.
// =============================================================

import React, { useState, useCallback } from "react";
import { useApp } from "@/lib/context";
import { Modal, Input, Textarea, Toggle } from "@/components/shared/ui";
import {
  ItemListSkeleton,
  CategoryListSkeleton,
  MenuPreviewSkeleton,
} from "@/components/shared/skeletons";
import { menuThemes } from "@/lib/theme";
import GuestMenu from "@/components/menu/GuestMenu";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  updateCategory,
  deleteCategory,
  ApiClientError,
} from "@/lib/api/client";
import { useMenuData, formatApiError } from "@/hooks/useMenuData";
import type { MenuItem, Category, MenuTheme, ViewMode } from "@/types";
import type { MenuItemDTO, CategoryDTO } from "@/types/api";

// =============================================================
// Preview items (read-only — no cart)
// =============================================================

// ItemMedia — shows real photo if available, falls back to emoji
// Shared between all preview modes and the item list panel
function ItemMedia({ item, size }: { item: MenuItem; size: number }) {
  const [err, setErr] = React.useState(false);
  const src = item.images?.[0];
  if (src && !err) {
    return (
      <img
        src={src}
        alt={item.nameEn}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center w-full h-full select-none"
      style={{ fontSize: size * 0.45 }}
      aria-hidden
    >
      {item.emoji || "🍽️"}
    </span>
  );
}

// BadgeChip — small styled label shown next to item name
function BadgeChip({ badge, accent }: { badge: string; accent: string }) {
  if (!badge) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 rounded-full font-bold"
      style={{
        fontSize: "0.58rem",
        lineHeight: "1.4",
        background: `${accent}22`,
        color: accent,
        border: `1px solid ${accent}45`,
        marginInlineStart: "4px",
        verticalAlign: "middle",
      }}
    >
      {badge}
    </span>
  );
}

function CompactPreviewItem({ item, theme }: { item: MenuItem; theme: MenuTheme }) {
  const { t } = useApp();
  return (
    <div
      className="grid items-center gap-2 p-1.5 rounded-lg"
      style={{ gridTemplateColumns: "54px 1fr auto", background: theme.cardBg, border: `1px solid ${theme.border}` }}
    >
      <div className="w-[54px] h-[54px] rounded-md overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,0,0,.1)" }}>
        <ItemMedia item={item} size={54} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold truncate" style={{ color: theme.titleColor }}>
          {t(item.nameAr, item.nameEn)}
          <BadgeChip badge={item.badge} accent={theme.accent} />
        </div>
        <div className="text-[0.6rem] truncate" style={{ color: theme.textDim }}>{t(item.descAr, item.descEn)}</div>
      </div>
      <div className="text-xs font-black font-[var(--fe)]" style={{ color: theme.accent }}>{item.price}</div>
    </div>
  );
}

function StandardPreviewItem({ item, theme }: { item: MenuItem; theme: MenuTheme }) {
  const { t } = useApp();
  return (
    <div className="grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: "90px 1fr", background: theme.cardBg, border: `1px solid ${theme.border}` }}>
      <div className="w-[90px] h-[90px] flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "rgba(0,0,0,.1)" }}>
        <ItemMedia item={item} size={90} />
      </div>
      <div className="p-2.5 flex flex-col justify-between min-w-0">
        <div>
          <div className="text-sm font-bold truncate" style={{ color: theme.titleColor }}>
            {t(item.nameAr, item.nameEn)}
            <BadgeChip badge={item.badge} accent={theme.accent} />
          </div>
          <div className="text-xs line-clamp-2" style={{ color: theme.textDim }}>{t(item.descAr, item.descEn)}</div>
        </div>
        <div className="text-sm font-black font-[var(--fe)] mt-1" style={{ color: theme.accent }}>{item.price} SAR</div>
      </div>
    </div>
  );
}

function GalleryPreviewItem({ item, theme }: { item: MenuItem; theme: MenuTheme }) {
  const { t } = useApp();
  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
      <div className="w-full aspect-square flex items-center justify-center relative overflow-hidden" style={{ background: "rgba(0,0,0,.1)" }}>
        <ItemMedia item={item} size={200} />
        {item.badge && (
          <span className="absolute top-1.5 end-1.5 px-2 py-0.5 rounded-full text-[0.55rem] font-bold z-10"
            style={{ background: "rgba(0,0,0,.65)", color: "#fff", backdropFilter: "blur(4px)" }}>
            {item.badge}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-xs font-bold truncate" style={{ color: theme.titleColor }}>{t(item.nameAr, item.nameEn)}</div>
        <div className="text-sm font-black font-[var(--fe)] mt-1" style={{ color: theme.accent }}>{item.price} SAR</div>
      </div>
    </div>
  );
}

function VideoPreviewItem({ item, theme }: { item: MenuItem; theme: MenuTheme }) {
  const { t } = useApp();
  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
      <div className="w-full relative flex items-center justify-center overflow-hidden" style={{ aspectRatio: "16/9", background: "rgba(0,0,0,.1)" }}>
        <ItemMedia item={item} size={360} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 rounded-full text-white text-sm flex items-center justify-center border border-white/40" style={{ background: "rgba(255,255,255,.25)" }}>▶</div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex justify-between">
          <div className="text-sm font-black" style={{ color: theme.titleColor }}>
            {t(item.nameAr, item.nameEn)}
            <BadgeChip badge={item.badge} accent={theme.accent} />
          </div>
          <div className="text-sm font-black font-[var(--fe)]" style={{ color: theme.accent }}>{item.price} SAR</div>
        </div>
        <div className="text-xs mt-0.5 line-clamp-1" style={{ color: theme.textDim }}>{t(item.descAr, item.descEn)}</div>
      </div>
    </div>
  );
}

// =============================================================
// MenuPreview
// =============================================================
function MenuPreview({ theme, viewMode, width }: { theme: MenuTheme; viewMode: ViewMode; width: number }) {
  const { state, t } = useApp();
  const visibleCats = state.categories.filter((c) => c.visible);
  return (
    <div className="flex-shrink-0 overflow-hidden rounded-[22px]"
      style={{ width, background: theme.bg, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
      <div className="px-4 py-4 text-center" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="text-lg font-black" style={{ color: theme.titleColor }}>{theme.restName || state.auth?.resto}</div>
        {theme.restSub && <div className="text-xs mt-0.5" style={{ color: theme.textDim }}>{theme.restSub}</div>}
      </div>
      <div className="flex gap-1.5 px-3.5 py-2.5 overflow-x-auto scrollbar-none" style={{ borderBottom: `1px solid ${theme.border}` }}>
        {visibleCats.map((cat, i) => (
          <div key={cat.id} className="flex-shrink-0 px-3.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
            style={{ background: i === 0 ? theme.accent : "transparent", color: i === 0 ? theme.accentText : theme.textDim, borderColor: theme.border }}>
            {cat.emoji} {t(cat.nameAr, cat.nameEn)}
          </div>
        ))}
      </div>
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        {visibleCats.map((cat) => {
          const catItems = state.items.filter((it) => it.categoryId === cat.id && it.available);
          if (!catItems.length) return null;
          return (
            <div key={cat.id} className="p-3">
              <div className="text-sm font-black mb-2" style={{ color: theme.titleColor }}>{cat.emoji} {t(cat.nameAr, cat.nameEn)}</div>
              {viewMode === "gallery" ? (
                <div className="grid grid-cols-2 gap-2">
                  {catItems.map((item) => <GalleryPreviewItem key={item.id} item={item} theme={theme} />)}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {catItems.map((item) =>
                    viewMode === "compact" ? <CompactPreviewItem key={item.id} item={item} theme={theme} /> :
                    viewMode === "video"   ? <VideoPreviewItem   key={item.id} item={item} theme={theme} /> :
                                            <StandardPreviewItem key={item.id} item={item} theme={theme} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// Error banner
// =============================================================
function ErrorBanner({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { state, t } = useApp();
  const msg = formatApiError(error, state.lang);
  const isAuth = error instanceof ApiClientError && error.status === 401;
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--rs)] border"
      style={{ background: "var(--dgs)", borderColor: "var(--dg)" }}>
      <span className="text-xl flex-shrink-0">{isAuth ? "🔒" : "⚠️"}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[var(--dg)]">
          {isAuth ? t("غير مصرح", "Unauthorized") : t("خطأ في تحميل البيانات", "Failed to load data")}
        </div>
        <div className="text-xs text-[var(--dg)] opacity-80 mt-0.5 break-words">{msg}</div>
      </div>
      <button
        onClick={onRetry}
        className="flex-shrink-0 px-3 py-1.5 rounded-[var(--rx)] text-xs font-bold border"
        style={{ borderColor: "var(--dg)", color: "var(--dg)", background: "transparent" }}
      >
        🔄 {t("إعادة المحاولة", "Retry")}
      </button>
    </div>
  );
}

// =============================================================
// Item Modal — Create / Edit
// =============================================================
const BLANK_ITEM = {
  categoryId: "", emoji: "🍽️", nameAr: "", nameEn: "",
  descAr: "", descEn: "", price: 0, badge: "", available: true, images: [],
};

// ── Photo upload helper ────────────────────────────────────────
async function uploadPhoto(file: File, itemId: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("item_id", itemId);
  const res = await fetch("/api/menu/items/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.data.url as string;
}

function ItemModal({
  item, isNew, onClose, onSaved, onDeleted, categories,
}: {
  item: MenuItem | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  categories: Category[];
}) {
  const { t, state } = useApp();
  const [form, setForm]         = useState<MenuItem>(item ?? { id: "", ...BLANK_ITEM, categoryId: categories[0]?.id ?? "" });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mutErr, setMutErr]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(form.images[0] ?? null);

  const set = (k: keyof MenuItem, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  // ── Photo upload ──────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setUploading(true);
    setMutErr(null);

    try {
      // For new items, use a temp ID; the URL will be stored after save
      const tempId = form.id || `temp-${Date.now()}`;
      const publicUrl = await uploadPhoto(file, tempId);
      set("images", [publicUrl]);
      setPhotoPreview(publicUrl);
    } catch (err) {
      setMutErr(t("فشل رفع الصورة، حاول مجدداً", "Photo upload failed, try again"));
      setPhotoPreview(form.images[0] ?? null);
    } finally {
      setUploading(false);
    }
  };

  // ── Build DTO ─────────────────────────────────────────────────
  const toDTO = (): Omit<MenuItemDTO, "id"> => ({
    name_ar:        form.nameAr,
    name_en:        form.nameEn,
    price:          form.price,
    image_url:      form.images[0] ?? "",
    category_id:    form.categoryId,
    description_ar: form.descAr,
    description_en: form.descEn,
    badge:          form.badge,   // persisted to DB
    available:      form.available,
    emoji:          form.emoji,   // persisted to DB
  });

  const handleSave = async () => {
    setSaving(true); setMutErr(null);
    try {
      if (isNew) {
        await createMenuItem(toDTO());
      } else {
        // form.id is now the real Supabase UUID string — no hashing needed
        await updateMenuItem(form.id, toDTO());
      }
      onSaved();
      onClose();
    } catch (err) {
      setMutErr(formatApiError(err instanceof Error ? err : new Error(String(err)), state.lang));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("حذف الصنف؟", "Delete item?"))) return;
    setDeleting(true); setMutErr(null);
    try {
      await deleteMenuItem(form.id);
      onDeleted();
      onClose();
    } catch (err) {
      setMutErr(formatApiError(err instanceof Error ? err : new Error(String(err)), state.lang));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="520px"
      title={`${isNew ? "➕" : "✏️"} ${t(isNew ? "صنف جديد" : "تعديل الصنف", isNew ? "New Item" : "Edit Item")}`}
      footer={
        <>
          <button onClick={handleSave} disabled={saving || deleting || uploading}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--ac)] text-black font-bold text-sm disabled:opacity-60">
            {saving ? `⏳ ${t("يحفظ…", "Saving…")}` : `💾 ${t("حفظ", "Save")}`}
          </button>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving || deleting || uploading}
              className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--dgs)] border border-[var(--dg)] text-[var(--dg)] text-sm font-semibold disabled:opacity-60">
              {deleting ? `⏳ ${t("يحذف…", "Deleting…")}` : `🗑 ${t("حذف", "Delete")}`}
            </button>
          )}
          <button onClick={onClose} disabled={saving || deleting}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd2)] text-sm font-semibold disabled:opacity-60">
            {t("إلغاء", "Cancel")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {mutErr && (
          <div className="px-3 py-2 rounded-[var(--rx)] text-xs font-semibold text-[var(--dg)]"
            style={{ background: "var(--dgs)", border: "1px solid var(--dg)" }}>
            ⚠️ {mutErr}
          </div>
        )}

        {/* ── Photo upload ── */}
        <div>
          <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">
            {t("صورة الصنف", "Item Photo")}
          </label>
          <div className="flex items-center gap-3">
            {/* Preview */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: "var(--b3)", border: "1px solid var(--bd2)" }}>
              {uploading ? (
                <span className="w-5 h-5 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
              ) : photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{form.emoji || "🍽️"}</span>
              )}
            </div>
            {/* File input */}
            <div className="flex-1">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-[var(--rx)] text-xs font-semibold border border-dashed border-[var(--bda)] text-[var(--ac)] hover:bg-[var(--acs)] transition-all">
                <span>📷</span>
                <span>{uploading ? t("جاري الرفع…", "Uploading…") : t("اختر صورة", "Choose photo")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                />
              </label>
              <p className="text-[0.65rem] text-[var(--c3)] mt-1">
                {t("JPG, PNG, WebP — 5MB كحد أقصى", "JPG, PNG, WebP — max 5MB")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("الاسم (عربي)", "Name (AR)")}</label>
            <Input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" />
          </div>
          <div>
            <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("الاسم (إنجليزي)", "Name (EN)")}</label>
            <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} dir="ltr" style={{ textAlign: "left" }} />
          </div>
        </div>
        <div>
          <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("وصف (عربي)", "Desc (AR)")}</label>
          <Textarea rows={2} value={form.descAr} onChange={(e) => set("descAr", e.target.value)} dir="rtl" />
        </div>
        <div>
          <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("وصف (إنجليزي)", "Desc (EN)")}</label>
          <Textarea rows={2} value={form.descEn} onChange={(e) => set("descEn", e.target.value)} dir="ltr" style={{ textAlign: "left" }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("السعر", "Price")} (SAR)</label>
            <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} dir="ltr" style={{ textAlign: "left" }} />
          </div>
          <div>
            <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("القسم", "Category")}</label>
            <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}
              className="w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)] px-3 py-2 text-sm text-[var(--c0)] outline-none focus:border-[var(--ac)]">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {t(c.nameAr, c.nameEn)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">Emoji</label>
            <Input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} style={{ textAlign: "center", fontSize: "1.2rem" }} />
          </div>
          <div>
            <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">Badge</label>
            <Input value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="🔥 جديد" />
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold">{t("متاح للطلب", "Available")}</span>
          <Toggle checked={form.available} onChange={(v) => set("available", v)} />
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// Category Modal — Create / Edit
// =============================================================
function CatModal({
  category, isNew, onClose, onSaved, onDeleted,
}: {
  category: Category | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { t, state } = useApp();
  const [form, setForm]       = useState<Category>(category ?? { id: "", emoji: "🍽️", nameAr: "", nameEn: "", visible: true });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mutErr, setMutErr]   = useState<string | null>(null);

  const set = (k: keyof Category, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const toDTO = (): Omit<CategoryDTO, "id"> => ({
    name_ar: form.nameAr,
    name_en: form.nameEn,
    emoji:   form.emoji,
    visible: form.visible,
  });

  const handleSave = async () => {
    setSaving(true); setMutErr(null);
    try {
      if (isNew) {
        await createCategory(toDTO());
      } else {
        await updateCategory(form.id, toDTO());
      }
      onSaved();
      onClose();
    } catch (err) {
      setMutErr(formatApiError(err instanceof Error ? err : new Error(String(err)), state.lang));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("حذف القسم؟", "Delete category?"))) return;
    setDeleting(true); setMutErr(null);
    try {
      await deleteCategory(form.id);
      onDeleted();
      onClose();
    } catch (err) {
      setMutErr(formatApiError(err instanceof Error ? err : new Error(String(err)), state.lang));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="380px"
      title={`${isNew ? "➕" : "✏️"} ${t(isNew ? "قسم جديد" : "تعديل القسم", isNew ? "New Category" : "Edit Category")}`}
      footer={
        <>
          <button onClick={handleSave} disabled={saving || deleting}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--ac)] text-black font-bold text-sm disabled:opacity-60">
            {saving ? `⏳ ${t("يحفظ…", "Saving…")}` : `💾 ${t("حفظ", "Save")}`}
          </button>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving || deleting}
              className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--dgs)] border border-[var(--dg)] text-[var(--dg)] text-sm font-semibold disabled:opacity-60">
              {deleting ? `⏳ ${t("يحذف…", "Deleting…")}` : `🗑 ${t("حذف", "Delete")}`}
            </button>
          )}
          <button onClick={onClose} disabled={saving || deleting}
            className="flex-1 py-2.5 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd2)] text-sm font-semibold disabled:opacity-60">
            {t("إلغاء", "Cancel")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {mutErr && (
          <div className="px-3 py-2 rounded-[var(--rx)] text-xs font-semibold text-[var(--dg)]"
            style={{ background: "var(--dgs)", border: "1px solid var(--dg)" }}>
            ⚠️ {mutErr}
          </div>
        )}
        <div className="text-center">
          <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">Emoji</label>
          <Input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} style={{ textAlign: "center", fontSize: "1.7rem", padding: "10px" }} />
        </div>
        <div>
          <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("الاسم (عربي)", "Name (AR)")}</label>
          <Input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" />
        </div>
        <div>
          <label className="text-[0.76rem] font-semibold text-[var(--c2)] mb-1 block">{t("الاسم (إنجليزي)", "Name (EN)")}</label>
          <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} dir="ltr" style={{ textAlign: "left" }} />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold">{t("ظاهر", "Visible")}</span>
          <Toggle checked={form.visible} onChange={(v) => set("visible", v)} />
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// Editor Panels
// =============================================================
const VIEW_MODES: { id: ViewMode; icon: string; labelAr: string; labelEn: string }[] = [
  { id: "compact",  icon: "📃", labelAr: "مدمج",   labelEn: "Compact" },
  { id: "standard", icon: "📋", labelAr: "عادي",   labelEn: "Standard" },
  { id: "gallery",  icon: "🖼️", labelAr: "معرض",   labelEn: "Gallery" },
  { id: "video",    icon: "🎬", labelAr: "فيديو",  labelEn: "Video" },
];
const SIZE_MAP: Record<string, number> = { small: 300, medium: 360, large: 420 };

function DesignPanel({ theme }: { theme: MenuTheme }) {
  const { dispatch, t } = useApp();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-[var(--c2)] mb-2">{t("الثيم", "Theme")}</div>
        <div className="flex flex-col gap-1.5">
          {menuThemes.map((mt) => (
            <button key={mt.id} onClick={() => dispatch({ type: "SET_MENU_THEME", payload: mt })}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--rs)] border text-start transition-all"
              style={{ background: theme.id === mt.id ? "var(--acs)" : "var(--b2)", borderColor: theme.id === mt.id ? "var(--ac)" : "var(--bd)" }}>
              <div className="flex gap-1">
                {[mt.bg, mt.accent, mt.cardBg].map((c, i) => (
                  <span key={i} className="w-3 h-3 rounded-full" style={{ background: c, border: "1px solid rgba(255,255,255,.2)" }} />
                ))}
              </div>
              <span className="text-xs font-semibold flex-1">{t(mt.nameAr, mt.nameEn)}</span>
              {theme.id === mt.id && <span className="text-[var(--ac)] text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-[var(--c2)] mb-1 block">{t("اسم المطعم في المنيو", "Restaurant name in menu")}</label>
        <Input value={theme.restName ?? ""} onChange={(e) => dispatch({ type: "SET_MENU_THEME", payload: { restName: e.target.value } })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-[var(--c2)] mb-1 block">{t("وصف مختصر", "Subtitle")}</label>
        <Input value={theme.restSub ?? ""} onChange={(e) => dispatch({ type: "SET_MENU_THEME", payload: { restSub: e.target.value } })} />
      </div>
      <div className="flex items-center justify-between py-2">
        <span className="text-sm">{t("السماح للزبون بتبديل العرض", "Allow guest view toggle")}</span>
        <Toggle checked={!!theme.allowToggle} onChange={(v) => dispatch({ type: "SET_MENU_THEME", payload: { allowToggle: v } })} />
      </div>
    </div>
  );
}

function ItemsPanel({
  isLoading, error, onRetry, onEditItem, onAddItem,
}: {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onEditItem: (i: MenuItem) => void;
  onAddItem: () => void;
}) {
  const { state, dispatch, t } = useApp();

  return (
    <div>
      <button onClick={onAddItem}
        className="w-full flex items-center justify-center gap-1.5 py-2 mb-3 rounded-[var(--rs)] border-2 border-dashed border-[var(--bda)] text-sm font-bold text-[var(--ac)] hover:bg-[var(--acs)] transition-all">
        ➕ {t("إضافة صنف", "Add Item")}
      </button>

      {/* Error */}
      {error && !isLoading && (
        <div className="mb-3"><ErrorBanner error={error} onRetry={onRetry} /></div>
      )}

      {/* Loading */}
      {isLoading && <ItemListSkeleton rows={6} />}

      {/* Data */}
      {!isLoading && (
        <div className="space-y-1.5">
          {state.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
              {/* ItemMedia: photo if available, emoji fallback */}
              <div className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--b3)" }}>
                <ItemMedia item={item} size={36} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate flex items-center gap-1">
                  {t(item.nameAr, item.nameEn)}
                  {item.badge && (
                    <span className="text-[0.55rem] font-bold px-1 rounded-full"
                      style={{ background: "var(--acs)", color: "var(--ac)", border: "1px solid var(--bda)" }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="text-[0.62rem] text-[var(--c2)] font-[var(--fe)]">{item.price} SAR</div>
              </div>
              <Toggle checked={item.available}
                onChange={(v) => dispatch({ type: "SET_ITEMS", payload: state.items.map((i) => i.id === item.id ? { ...i, available: v } : i) })} />
              <button onClick={() => onEditItem(item)}
                className="w-6 h-6 rounded bg-[var(--acs)] border border-[var(--bda)] text-[var(--ac)] text-xs flex items-center justify-center">
                ✏️
              </button>
            </div>
          ))}
          {state.items.length === 0 && !error && (
            <div className="py-8 text-center text-sm text-[var(--c3)]">
              {t("لا أصناف — أضف أول صنف", "No items yet — add your first")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CatsPanel({
  isLoading, error, onRetry, onEditCat, onAddCat,
}: {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onEditCat: (c: Category) => void;
  onAddCat: () => void;
}) {
  const { state, dispatch, t } = useApp();

  return (
    <div>
      <button onClick={onAddCat}
        className="w-full flex items-center justify-center gap-1.5 py-2 mb-3 rounded-[var(--rs)] border-2 border-dashed border-[var(--bda)] text-sm font-bold text-[var(--ac)] hover:bg-[var(--acs)] transition-all">
        ➕ {t("إضافة قسم", "Add Category")}
      </button>

      {error && !isLoading && (
        <div className="mb-3"><ErrorBanner error={error} onRetry={onRetry} /></div>
      )}

      {isLoading && <CategoryListSkeleton rows={5} />}

      {!isLoading && (
        <div className="space-y-1.5">
          {state.categories.map((cat) => {
            const count = state.items.filter((x) => x.categoryId === cat.id).length;
            return (
              <div key={cat.id} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
                <span className="text-[var(--c3)] cursor-grab select-none text-sm">⋮⋮</span>
                <span className="text-base">{cat.emoji}</span>
                <span className="flex-1 font-semibold text-xs cursor-pointer" onClick={() => onEditCat(cat)}>
                  {t(cat.nameAr, cat.nameEn)}
                </span>
                <span className="text-[0.6rem] text-[var(--c3)] font-[var(--fe)]">{count}</span>
                <Toggle checked={cat.visible}
                  onChange={(v) => dispatch({ type: "SET_CATEGORIES", payload: state.categories.map((c) => c.id === cat.id ? { ...c, visible: v } : c) })} />
                <button onClick={() => onEditCat(cat)}
                  className="w-5 h-5 rounded bg-[var(--acs)] border border-[var(--bda)] text-[var(--ac)] text-[0.6rem] flex items-center justify-center">
                  ✏️
                </button>
              </div>
            );
          })}
          {state.categories.length === 0 && !error && (
            <div className="py-8 text-center text-sm text-[var(--c3)]">
              {t("لا أقسام — أضف أول قسم", "No categories yet — add your first")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// MenuEditor — root component
// =============================================================
export default function MenuEditor() {
  const { state, dispatch, t } = useApp();

  // ── Data fetching ──────────────────────────────────────────
  const { isLoading, error, refetch, isInitialized } = useMenuData();

  // ── Local UI state ─────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<"design" | "items" | "cats">("design");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [addingItem, setAddingItem]   = useState(false);
  const [editingCat, setEditingCat]   = useState<Category | null>(null);
  const [addingCat, setAddingCat]     = useState(false);
  const [guestTableId, setGuestTableId] = useState<number | null>(null);

  const theme      = state.menuTheme;
  const viewMode   = (theme.viewMode ?? "standard") as ViewMode;
  const previewWidth = SIZE_MAP[theme.previewSize ?? "medium"];

  // ── Mutation callbacks — MUST be before any early return ───
  // React requires all hooks to be called unconditionally and in
  // the same order every render. useCallback is a hook.
  // The early return for guestTableId was previously BEFORE these,
  // causing "Rendered fewer hooks than expected" error.
  const handleItemSaved   = useCallback(() => refetch(), [refetch]);
  const handleItemDeleted = useCallback(() => refetch(), [refetch]);
  const handleCatSaved    = useCallback(() => refetch(), [refetch]);
  const handleCatDeleted  = useCallback(() => refetch(), [refetch]);

  // ── Guest preview — early return AFTER all hooks ────────────
  if (guestTableId !== null) {
    return <GuestMenu tableId={guestTableId} onClose={() => setGuestTableId(null)} />;
  }

  const tabBtn = (tab: "design" | "items" | "cats", label: string) => (
    <button key={tab} onClick={() => setActiveTab(tab)}
      className="flex-1 py-1.5 text-xs font-semibold rounded-[var(--rx)] transition-all"
      style={{ background: activeTab === tab ? "var(--acs)" : "transparent", color: activeTab === tab ? "var(--ac)" : "var(--c2)" }}>
      {label}
    </button>
  );

  return (
    <div className="p-4 md:p-5 flex flex-col gap-3.5">

      {/* Loading indicator — shown when data is refreshing */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--c2)] animate-pulse">
          <span className="w-3 h-3 rounded-full border border-[var(--ac)] border-t-transparent animate-spin" />
          {t("يحمّل…", "Loading…")}
        </div>
      )}

      {/* ── Top-level error (failed initial load) ── */}
      {error && !isLoading && !isInitialized && (
        <ErrorBanner error={error} onRetry={refetch} />
      )}

      {/* ── 2-col layout ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px", height: "calc(100vh - 220px)", minHeight: 560 }}>

        {/* Preview pane */}
        <div className="bg-[var(--b2)] rounded-[var(--r)] border border-[var(--bd)] flex flex-col overflow-hidden">

          {/* View mode / size controls */}
          <div className="flex flex-wrap justify-between items-center gap-2 px-3.5 py-2.5 border-b border-[var(--bd)] bg-[var(--b1)]">
            <div className="flex gap-1">
              {VIEW_MODES.map((m) => (
                <button key={m.id} onClick={() => dispatch({ type: "SET_MENU_THEME", payload: { viewMode: m.id } })}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--rx)] text-xs font-semibold border transition-all"
                  style={{ background: viewMode === m.id ? "var(--acs)" : "var(--b2)", borderColor: viewMode === m.id ? "var(--ac)" : "var(--bd2)", color: viewMode === m.id ? "var(--ac)" : "var(--c2)" }}>
                  {m.icon} {t(m.labelAr, m.labelEn)}
                </button>
              ))}
            </div>
            <div className="flex gap-1 items-center">
              <span className="text-xs text-[var(--c2)]">{t("حجم", "Size")}:</span>
              {(["small", "medium", "large"] as const).map((s) => (
                <button key={s} onClick={() => dispatch({ type: "SET_MENU_THEME", payload: { previewSize: s } })}
                  className="w-6 h-6 rounded-[var(--rx)] text-xs font-bold font-[var(--fe)] border transition-all"
                  style={{ background: (theme.previewSize ?? "medium") === s ? "var(--ac)" : "var(--b2)", color: (theme.previewSize ?? "medium") === s ? "#000" : "var(--c2)", borderColor: (theme.previewSize ?? "medium") === s ? "var(--ac)" : "var(--bd2)" }}>
                  {s === "small" ? "S" : s === "medium" ? "M" : "L"}
                </button>
              ))}
            </div>
          </div>

          {/* Phone preview / skeleton */}
          <div className="flex-1 overflow-auto flex justify-center items-start p-4"
            style={{ background: "repeating-conic-gradient(var(--b2) 0% 25%, transparent 0% 50%) 50%/18px 18px" }}>
            {isLoading && !isInitialized
              ? <MenuPreviewSkeleton width={previewWidth} />
              : <MenuPreview theme={theme} viewMode={viewMode} width={previewWidth} />
            }
          </div>
        </div>

        {/* Editor panel */}
        <div className="bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] flex flex-col overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-[var(--bd)]">
            {tabBtn("design", t("التصميم", "Design"))}
            {tabBtn("items",  t("الأصناف",  "Items"))}
            {tabBtn("cats",   t("الأقسام",  "Cats"))}
          </div>
          <div className="flex-1 overflow-y-auto p-3.5">
            {activeTab === "design" && <DesignPanel theme={theme} />}
            {activeTab === "items" && (
              <ItemsPanel
                isLoading={isLoading}
                error={error}
                onRetry={refetch}
                onEditItem={(item) => { setEditingItem(item); setAddingItem(false); }}
                onAddItem={() => { setEditingItem(null); setAddingItem(true); }}
              />
            )}
            {activeTab === "cats" && (
              <CatsPanel
                isLoading={isLoading}
                error={error}
                onRetry={refetch}
                onEditCat={(cat) => { setEditingCat(cat); setAddingCat(false); }}
                onAddCat={() => { setEditingCat(null); setAddingCat(true); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Item Modal ── */}
      {(editingItem !== null || addingItem) && (
        <ItemModal
          item={editingItem}
          isNew={addingItem}
          categories={state.categories}
          onClose={() => { setEditingItem(null); setAddingItem(false); }}
          onSaved={handleItemSaved}
          onDeleted={handleItemDeleted}
        />
      )}

      {/* ── Category Modal ── */}
      {(editingCat !== null || addingCat) && (
        <CatModal
          category={editingCat}
          isNew={addingCat}
          onClose={() => { setEditingCat(null); setAddingCat(false); }}
          onSaved={handleCatSaved}
          onDeleted={handleCatDeleted}
        />
      )}
    </div>
  );
}
