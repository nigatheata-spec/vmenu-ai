"use client";

import React, { useState, useCallback } from "react";
import { useApp } from "@/lib/context";
import type { MenuItem, CartItem, ViewMode } from "@/types";

// =============================================================
// Shared visual primitives
// =============================================================

// ── ItemMedia — photo if available, emoji as fallback ────────
// Rule: always try the image first; if missing/broken → show emoji
function ItemMedia({
  item,
  size,
  className = "",
}: {
  item: MenuItem;
  size: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const src = item.images?.[0];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={item.nameEn}
        width={size}
        height={size}
        className={`w-full h-full object-cover ${className}`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }
  // Emoji fallback — centred in the same space
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

// ── Badge chip — small pill shown next to item name ──────────
// Rule: visible only when item.badge is non-empty
function BadgeChip({ badge, accent }: { badge: string; accent: string }) {
  if (!badge) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0 rounded-full font-bold leading-none"
      style={{
        fontSize: "0.6rem",
        background: `${accent}25`,
        color: accent,
        border: `1px solid ${accent}50`,
        verticalAlign: "middle",
        marginInlineStart: "4px",
      }}
    >
      {badge}
    </span>
  );
}

// ── Cart Bar ──────────────────────────────────────────────────
interface CartBarProps {
  cart: CartItem[];
  accent: string;
  accentText: string;
  onSubmit: () => void;
}
function CartBar({ cart, accent, accentText, onSubmit }: CartBarProps) {
  const { t } = useApp();
  const count = cart.reduce((s, x) => s + x.qty, 0);
  const total = cart.reduce((s, x) => s + x.qty * x.price, 0);
  if (!count) return null;
  return (
    <div className="fixed bottom-3.5 left-3.5 right-3.5 max-w-[472px] mx-auto z-40 animate-fadeUp">
      <button
        onClick={onSubmit}
        className="w-full flex items-center justify-between rounded-[var(--r)] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,.3)]"
        style={{ background: accent, color: accentText }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-[6px] flex items-center justify-center font-black text-xs font-[var(--fe)]"
            style={{ background: "rgba(0,0,0,.15)" }}
          >
            {count}
          </div>
          <span className="font-bold text-sm">{t("تأكيد الطلب", "Confirm Order")}</span>
        </div>
        <span className="font-black text-base font-[var(--fe)]">{total} SAR</span>
      </button>
    </div>
  );
}

// ── Qty Button ────────────────────────────────────────────────
interface QtyBtnProps {
  item: MenuItem;
  cart: CartItem[];
  accent: string;
  accentText: string;
  onAdd: (id: string) => void;
  onDec: (id: string) => void;
}
function QtyBtn({ item, cart, accent, accentText, onAdd, onDec }: QtyBtnProps) {
  const inCart = cart.find((x) => String(x.itemId) === String(item.id));
  if (inCart) {
    return (
      <div
        className="flex items-center gap-1 rounded-lg"
        style={{ border: `1px solid ${accent}`, background: `${accent}20` }}
      >
        <button onClick={() => onDec(String(item.id))} className="w-7 h-7 text-sm font-bold" style={{ color: accent }}>−</button>
        <span className="min-w-[18px] text-center font-black text-xs font-[var(--fe)]">{inCart.qty}</span>
        <button onClick={() => onAdd(String(item.id))} className="w-7 h-7 text-sm font-bold" style={{ color: accent }}>+</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onAdd(String(item.id))}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xl font-light"
      style={{ background: accent, color: accentText }}
    >+</button>
  );
}

// =============================================================
// Item row components — each uses ItemMedia + BadgeChip
// =============================================================

// Shared props type
interface ItemRowProps {
  item: MenuItem;
  cart: CartItem[];
  theme: ReturnType<typeof useApp>["state"]["menuTheme"];
  onAdd: (id: string) => void;
  onDec: (id: string) => void;
}

// ── Compact ───────────────────────────────────────────────────
function CompactRow({ item, cart, theme, onAdd, onDec }: ItemRowProps) {
  const { t } = useApp();
  return (
    <div
      className="grid items-center gap-2.5 p-1.5 rounded-lg"
      style={{ gridTemplateColumns: "56px 1fr auto", background: theme.cardBg, border: `1px solid ${theme.border}` }}
    >
      {/* Photo or emoji — 56×56 */}
      <div className="w-[56px] h-[56px] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,.12)" }}>
        <ItemMedia item={item} size={56} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: theme.titleColor }}>
          {t(item.nameAr, item.nameEn)}
          <BadgeChip badge={item.badge} accent={theme.accent} />
        </div>
        <div className="text-xs font-bold font-[var(--fe)]" style={{ color: theme.accent }}>
          {item.price} SAR
        </div>
      </div>
      <QtyBtn item={item} cart={cart} accent={theme.accent} accentText={theme.accentText} onAdd={onAdd} onDec={onDec} />
    </div>
  );
}

// ── Standard ──────────────────────────────────────────────────
function StandardRow({ item, cart, theme, onAdd, onDec }: ItemRowProps) {
  const { t } = useApp();
  return (
    <div
      className="grid overflow-hidden rounded-xl"
      style={{ gridTemplateColumns: "90px 1fr", background: theme.cardBg, border: `1px solid ${theme.border}` }}
    >
      {/* Photo or emoji — 90×90 */}
      <div className="w-[90px] h-[90px] flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: "rgba(0,0,0,.12)" }}>
        <ItemMedia item={item} size={90} />
      </div>
      <div className="p-2.5 flex flex-col justify-between min-w-0">
        <div>
          <div className="text-sm font-bold leading-snug" style={{ color: theme.titleColor }}>
            {t(item.nameAr, item.nameEn)}
            <BadgeChip badge={item.badge} accent={theme.accent} />
          </div>
          <div className="text-xs line-clamp-2 mt-0.5" style={{ color: theme.textDim }}>
            {t(item.descAr, item.descEn)}
          </div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-sm font-black font-[var(--fe)]" style={{ color: theme.accent }}>
            {item.price} SAR
          </div>
          <QtyBtn item={item} cart={cart} accent={theme.accent} accentText={theme.accentText} onAdd={onAdd} onDec={onDec} />
        </div>
      </div>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────
function GalleryCard({ item, cart, theme, onAdd, onDec }: ItemRowProps) {
  const { t } = useApp();
  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
      {/* Square photo/emoji area — badge overlaid top-right */}
      <div className="w-full aspect-square relative overflow-hidden flex items-center justify-center"
        style={{ background: "rgba(0,0,0,.12)" }}>
        <ItemMedia item={item} size={200} className="absolute inset-0" />
        {item.badge && (
          <span className="absolute top-1.5 end-1.5 px-2 py-0.5 rounded-full text-[0.6rem] font-bold z-10"
            style={{ background: "rgba(0,0,0,.65)", color: "#fff", backdropFilter: "blur(4px)" }}>
            {item.badge}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-[0.8rem] font-bold truncate" style={{ color: theme.titleColor }}>
          {t(item.nameAr, item.nameEn)}
        </div>
        <div className="text-[0.62rem] line-clamp-2 min-h-[1.5em] mt-0.5" style={{ color: theme.textDim }}>
          {t(item.descAr, item.descEn)}
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <div className="text-sm font-black font-[var(--fe)]" style={{ color: theme.accent }}>{item.price} SAR</div>
          <QtyBtn item={item} cart={cart} accent={theme.accent} accentText={theme.accentText} onAdd={onAdd} onDec={onDec} />
        </div>
      </div>
    </div>
  );
}

// ── Video ─────────────────────────────────────────────────────
function VideoCard({ item, cart, theme, onAdd, onDec }: ItemRowProps) {
  const { t } = useApp();
  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
      <div className="w-full relative overflow-hidden flex items-center justify-center"
        style={{ aspectRatio: "16/9", background: "rgba(0,0,0,.12)" }}>
        <ItemMedia item={item} size={360} className="absolute inset-0" />
        {/* Video play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40 z-10"
            style={{ background: "rgba(255,255,255,.22)", backdropFilter: "blur(8px)", color: "#fff" }}>▶</div>
        </div>
        {item.badge && (
          <span className="absolute top-2 end-2 px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold z-20"
            style={{ background: theme.accent, color: theme.accentText }}>{item.badge}</span>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex justify-between items-start gap-2 mb-1">
          <div className="text-base font-black" style={{ color: theme.titleColor }}>
            {t(item.nameAr, item.nameEn)}
          </div>
          <div className="text-base font-black font-[var(--fe)] flex-shrink-0" style={{ color: theme.accent }}>
            {item.price} SAR
          </div>
        </div>
        <div className="text-xs leading-relaxed mb-2" style={{ color: theme.textDim }}>
          {t(item.descAr, item.descEn)}
        </div>
        <div className="flex justify-end">
          <QtyBtn item={item} cart={cart} accent={theme.accent} accentText={theme.accentText} onAdd={onAdd} onDec={onDec} />
        </div>
      </div>
    </div>
  );
}

// ── Order Success ─────────────────────────────────────────────
function OrderSuccess({ orderId, tableId, cart, total, onClose }: {
  orderId: string; tableId: number; cart: CartItem[]; total: number; onClose: () => void;
}) {
  const { state, t } = useApp();
  const theme = state.menuTheme;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 font-arabic"
      style={{ background: theme.bg, color: theme.titleColor }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 animate-pop"
        style={{ background: "var(--scs)", border: "3px solid var(--sc)" }}>✓</div>
      <div className="text-xl font-black mb-1">{t("تم استلام طلبك!", "Order Received!")}</div>
      <div className="text-sm mb-1.5" style={{ color: theme.textDim }}>{t("طاولة", "Table")} {tableId}</div>
      <div className="text-3xl font-black font-[var(--fe)] mb-5" style={{ color: theme.accent }}>{orderId}</div>
      <div className="p-4 rounded-[var(--r)] mb-5 min-w-[240px]" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
        <div className="text-xs mb-2" style={{ color: theme.textDim }}>{t("طلبك:", "Your order:")}</div>
        {cart.map((x) => (
          <div key={x.itemId} className="flex justify-between text-sm" style={{ color: theme.titleColor }}>
            <span>{t(x.nameAr, x.nameEn)} ×{x.qty}</span>
            <span className="font-[var(--fe)]" style={{ color: theme.accent }}>{x.qty * x.price} SAR</span>
          </div>
        ))}
        <div className="flex justify-between font-black mt-2 pt-2" style={{ borderTop: `1px solid ${theme.border}`, color: theme.titleColor }}>
          <span>{t("الإجمالي", "Total")}</span>
          <span className="font-[var(--fe)]" style={{ color: theme.accent }}>{total} SAR</span>
        </div>
      </div>
      <div className="text-xs max-w-[320px]" style={{ color: theme.textDim }}>
        {t("سيتم تحضير طلبك وإخطارك عند جاهزيته.", "Your order is being prepared.")}
      </div>
      {/* Link to live order tracking page */}
      <a href={`/order/${orderId}`}
        className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold"
        style={{ background: `${theme.accent}25`, color: theme.accent, border: `1px solid ${theme.accent}50` }}>
        📡 {t("تتبع طلبك", "Track Order")}
      </a>
      <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-full text-sm font-bold"
        style={{ background: theme.accent, color: theme.accentText }}>
        {t("إغلاق", "Close")}
      </button>
    </div>
  );
}

// =============================================================
// Main Guest Menu
// =============================================================
interface GuestMenuProps {
  tableId: number;
  onClose: () => void;
}

export default function GuestMenu({ tableId, onClose }: GuestMenuProps) {
  const { state, dispatch, t } = useApp();
  const theme = state.menuTheme;
  const [viewMode, setViewMode]     = useState<ViewMode>(theme.viewMode ?? "standard");
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [activeCat, setActiveCat]   = useState<string>("");
  const [orderDone, setOrderDone]   = useState<{ orderId: string; total: number } | null>(null);
  const [activeTableId, setActiveTableId] = useState<number>(tableId);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [dbTables, setDbTables]     = useState<{id:string; table_number:number}[]>([]);

  // Load table list for the picker using the lightweight /api/tables/numbers endpoint.
  // This endpoint is accessible to ANY authenticated user (no tables:read required),
  // so kitchen/cashier/marketing staff can pick a table when placing orders.
  React.useEffect(() => {
    fetch("/api/tables/numbers")
      .then(r => r.json() as Promise<{data?:{id:string;table_number:number;name:string|null}[]}>)
      .then(j => setDbTables(j.data ?? []))
      .catch(() => {});
  }, []);

  const visibleCats = state.categories.filter((c) => c.visible);

  const addToCart = useCallback((itemId: string) => {
    const item = state.items.find((x) => String(x.id) === String(itemId));
    if (!item) return;
    setCart((prev) => {
      const ex = prev.find((x) => x.itemId === itemId);
      if (ex) return prev.map((x) => (x.itemId === itemId ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { itemId: String(itemId), qty: 1, price: item.price, emoji: item.emoji, nameAr: item.nameAr, nameEn: item.nameEn }];
    });
  }, [state.items]);

  const decFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const ex = prev.find((x) => x.itemId === itemId);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter((x) => x.itemId !== itemId);
      return prev.map((x) => (x.itemId === itemId ? { ...x, qty: x.qty - 1 } : x));
    });
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async () => {
    if (!cart.length || submitting) return;
    const total = cart.reduce((s, x) => s + x.qty * x.price, 0);
    setSubmitting(true);
    try {
      // Resolve the real table UUID from the already-fetched dbTables list.
      // We do NOT re-fetch /api/tables here because:
      //   1. It requires auth — may return 401/403 in some staff flows
      //   2. dbTables was fetched on component mount and is already in state
      //   3. Avoids a second network round-trip before the order is placed
      // Resolve table UUID from the already-loaded dbTables list.
      // We never re-fetch here — the mount-time fetch handles loading,
      // and a second fetch would 403 for roles without tables:read.
      const tableRow = dbTables.find(t => t.table_number === activeTableId);
      const resolvedTableId: string | null = tableRow?.id ?? null;

      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: resolvedTableId,   // real UUID — never null when table is selected
          items: cart.map((x) => ({ menu_item_id: String(x.itemId), quantity: x.qty })),
        }),
      });
      const json = await res.json() as { data?: { id:string } };
      const orderId = json.data?.id ?? `VM-${Date.now()}`;

      // Mark table as active (busy) when an order is placed
      if (resolvedTableId) {
        fetch(`/api/tables/${resolvedTableId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        }).catch(() => {});
      }

      setOrderDone({ orderId, total });
    } catch {
      const orderId = `VM-${Date.now()}`;
      setOrderDone({ orderId, total });
    } finally {
      setSubmitting(false);
    }
  };

  if (orderDone) {
    return <OrderSuccess orderId={orderDone.orderId} tableId={tableId} cart={cart} total={orderDone.total} onClose={onClose} />;
  }

  const itemProps = { cart, theme, onAdd: addToCart, onDec: decFromCart };

  return (
    <div className="min-h-screen font-arabic pb-24" style={{ background: theme.bg, color: theme.titleColor }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 flex justify-between items-center px-3.5 py-2.5"
        style={{ background: `${theme.bg}ee`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-xs font-black"
            style={{ background: theme.accent, color: theme.accentText }}>V</div>
          <span className="text-sm font-bold">{theme.restName || state.auth?.resto}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Staff can tap to change their active table */}
          <button
            onClick={() => setShowTablePicker(true)}
            className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            style={{ background: `${theme.accent}20`, border: `1px solid ${theme.accent}60`, color: theme.accent }}>
            {t("طاولة", "Table")} {activeTableId}
            <span className="opacity-60">▾</span>
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(0,0,0,.2)", color: theme.titleColor }}>✕</button>
        </div>
      </div>

      {/* ── View mode toggle ── */}
      {theme.allowToggle && (
        <div className="flex justify-center gap-1 py-2" style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
          {(["compact", "standard", "gallery", "video"] as const).map((m, i) => {
            const icons = ["📃", "📋", "🖼️", "🎬"];
            return (
              <button key={m} onClick={() => setViewMode(m)} className="w-8 h-8 rounded-lg text-sm border"
                style={{ background: viewMode === m ? theme.accent : "transparent", color: viewMode === m ? theme.accentText : theme.textDim, borderColor: viewMode === m ? theme.accent : theme.border }}>
                {icons[i]}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Restaurant name ── */}
      <div className="text-center px-3.5 py-6">
        <div className="text-2xl font-black" style={{ color: theme.titleColor }}>{theme.restName || state.auth?.resto}</div>
        {theme.restSub && <div className="text-sm mt-1" style={{ color: theme.textDim }}>{theme.restSub}</div>}
      </div>

      {/* ── Category pills — show emoji + name ── */}
      <div className="flex gap-1.5 px-3.5 pb-2.5 overflow-x-auto scrollbar-none sticky top-[52px] z-20"
        style={{ borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}f0`, backdropFilter: "blur(12px)" }}>
        {visibleCats.map((cat, i) => (
          <button key={cat.id}
            onClick={() => {
              setActiveCat(cat.id);
              document.getElementById(`guest-sec-${cat.id}`)?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition-all"
            style={{
              background:  activeCat === cat.id || (i === 0 && !activeCat) ? theme.accent : "transparent",
              color:       activeCat === cat.id || (i === 0 && !activeCat) ? theme.accentText : theme.textDim,
              borderColor: theme.border,
            }}
          >
            {/* Emoji before category name */}
            {cat.emoji && <span className="text-base leading-none">{cat.emoji}</span>}
            {t(cat.nameAr, cat.nameEn)}
          </button>
        ))}
      </div>

      {/* ── Items by category — category header shows emoji + name ── */}
      <div className="px-3.5 max-w-[500px] mx-auto">
        {visibleCats.map((cat) => {
          const catItems = state.items.filter((it) => it.categoryId === cat.id && it.available);
          if (!catItems.length) return null;
          return (
            <div key={cat.id} id={`guest-sec-${cat.id}`} className="pt-4 scroll-mt-[110px]">
              {/* Section header — emoji prominent, name beside it */}
              <div className="flex items-center gap-2 mb-2">
                {cat.emoji && (
                  <span className="text-xl leading-none">{cat.emoji}</span>
                )}
                <span className="text-base font-black" style={{ color: theme.titleColor }}>
                  {t(cat.nameAr, cat.nameEn)}
                </span>
              </div>
              {viewMode === "gallery" ? (
                <div className="grid grid-cols-2 gap-2">
                  {catItems.map((item) => <GalleryCard key={item.id} item={item} {...itemProps} />)}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {catItems.map((item) =>
                    viewMode === "compact"  ? <CompactRow  key={item.id} item={item} {...itemProps} /> :
                    viewMode === "video"    ? <VideoCard   key={item.id} item={item} {...itemProps} /> :
                                              <StandardRow key={item.id} item={item} {...itemProps} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CartBar cart={cart} accent={theme.accent} accentText={theme.accentText} onSubmit={submitOrder} />

      {/* ── Table picker modal for staff ── */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setShowTablePicker(false)}>
          <div className="w-full max-w-sm rounded-[var(--r)] p-4"
            style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
            onClick={e => e.stopPropagation()}>
            <div className="text-sm font-black mb-3" style={{ color: theme.titleColor }}>
              {t("اختر طاولة", "Select Table")}
            </div>
            {dbTables.length === 0 ? (
              /* Loading state — show spinner while fetching tables from DB */
              <div className="flex items-center justify-center py-8 gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
                <span className="text-sm" style={{ color: theme.textDim }}>
                  {t("جاري التحميل…", "Loading tables…")}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {dbTables
                  .sort((a, b) => a.table_number - b.table_number)
                  .map(tbl => (
                    <button key={tbl.id}
                      onClick={() => { setActiveTableId(tbl.table_number); setShowTablePicker(false); }}
                      className="aspect-square rounded-lg font-black text-sm transition-all"
                      style={{
                        background: activeTableId === tbl.table_number ? theme.accent : `${theme.accent}15`,
                        color:      activeTableId === tbl.table_number ? theme.accentText : theme.titleColor,
                        border: `1px solid ${activeTableId === tbl.table_number ? theme.accent : theme.border}`,
                      }}>
                      {tbl.table_number}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
