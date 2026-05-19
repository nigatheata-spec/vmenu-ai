"use client";

// =============================================================
// components/menu/GuestMenuPage.tsx
//
// Client wrapper for the public /menu/[venueId]/table/[tableId] route.
// Fetches the menu data from the public API (no auth) and
// renders the GuestMenu component.
// =============================================================

import React, { useEffect, useState } from "react";
import type { MenuItem, Category }    from "@/types";
import type { MenuItemDTO, CategoryDTO } from "@/types/api";
import { toMenuItems, toCategories }  from "@/lib/api/transformers";

interface GuestMenuPageProps {
  venueId:     string;
  venueSlug:   string;
  venueName:   string;
  tableId:     string;
  tableNumber: number;
}

// Minimal order cart
interface CartLine { itemId: string; qty: number; price: number; nameAr: string; nameEn: string; emoji: string; }

export default function GuestMenuPage({
  venueId, venueSlug, venueName, tableId, tableNumber,
}: GuestMenuPageProps) {
  const [items,      setItems]      = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [cart,       setCart]       = useState<CartLine[]>([]);
  const [ordered,    setOrdered]    = useState(false);
  const [orderId,    setOrderId]    = useState<string | null>(null);

  // Fetch public menu data
  useEffect(() => {
    const load = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          fetch(`/api/menu/items?venue_id=${venueId}`),
          fetch(`/api/menu/categories?venue_id=${venueId}`),
        ]);
        const [itemsJson, catsJson] = await Promise.all([
          itemsRes.json() as Promise<{ data: MenuItemDTO[] }>,
          catsRes.json()  as Promise<{ data: CategoryDTO[] }>,
        ]);
        setItems(toMenuItems(itemsJson.data ?? []));
        setCategories(toCategories(catsJson.data ?? []));
      } catch {
        setError("Could not load the menu. Please try scanning again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [venueId]);

  const addToCart = (itemId: string) => {
    const item = items.find((x) => x.id === itemId);
    if (!item) return;
    setCart((prev) => {
      const ex = prev.find((x) => x.itemId === itemId);
      if (ex) return prev.map((x) => x.itemId === itemId ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { itemId, qty: 1, price: item.price, nameAr: item.nameAr, nameEn: item.nameEn, emoji: item.emoji }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const ex = prev.find((x) => x.itemId === itemId);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter((x) => x.itemId !== itemId);
      return prev.map((x) => x.itemId === itemId ? { ...x, qty: x.qty - 1 } : x);
    });
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    try {
      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          table_id: tableId,
          items:    cart.map((x) => ({ menu_item_id: x.itemId, quantity: x.qty })),
        }),
      });
      const json = await res.json() as { data?: { id: string } };
      if (res.ok && json.data?.id) {
        setOrderId(json.data.id);
        setOrdered(true);
      }
    } catch {
      // Guest menu — silently fail, user can retry
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <span className="w-10 h-10 rounded-full border-2 border-[#333] border-t-[#c9a96e] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white text-center p-8">
        <div>
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-bold mb-2">Menu Unavailable</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (ordered && orderId) {
    const total = cart.reduce((s, x) => s + x.qty * x.price, 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white text-center p-8">
        <div className="max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <h2 className="text-xl font-black mb-1">{venueName}</h2>
          <p className="text-sm text-gray-400 mb-4">Table {tableNumber} — Order #{orderId.slice(-6).toUpperCase()}</p>
          <div className="bg-[#111] rounded-xl p-4 mb-4 text-left">
            {cart.map((x) => (
              <div key={x.itemId} className="flex justify-between py-1 text-sm">
                <span>{x.emoji} {x.nameEn} ×{x.qty}</span>
                <span className="text-[#c9a96e]">{x.qty * x.price} SAR</span>
              </div>
            ))}
            <div className="flex justify-between font-black pt-2 mt-2 border-t border-gray-700">
              <span>Total</span>
              <span className="text-[#c9a96e]">{total} SAR</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Your order is being prepared. We'll bring it to your table.</p>
        </div>
      </div>
    );
  }

  const visibleCats = categories.filter((c) => c.visible);
  const cartCount   = cart.reduce((s, x) => s + x.qty, 0);
  const cartTotal   = cart.reduce((s, x) => s + x.qty * x.price, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 flex justify-between items-center px-4 py-3 bg-[#0a0a0fcc] backdrop-blur-xl border-b border-[#1a1a2a]">
        <span className="font-black text-base">{venueName}</span>
        <div className="px-3 py-1 rounded-full text-xs font-bold text-[#c9a96e]"
          style={{ background: "rgba(201,169,110,.15)", border: "1px solid rgba(201,169,110,.4)" }}>
          Table {tableNumber}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-none border-b border-[#1a1a2a] bg-[#0a0a0ff0] sticky top-[52px] z-20">
        {visibleCats.map((cat) => (
          <button key={cat.id}
            onClick={() => document.getElementById(`sec-${cat.id}`)?.scrollIntoView({ behavior: "smooth" })}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border border-[#1a1a2a] text-[#666680] whitespace-nowrap hover:border-[#c9a96e] hover:text-[#c9a96e] transition-all">
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.nameEn}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="px-4 max-w-[500px] mx-auto">
        {visibleCats.map((cat) => {
          const catItems = items.filter((i) => i.categoryId === cat.id && i.available);
          if (!catItems.length) return null;
          return (
            <div key={cat.id} id={`sec-${cat.id}`} className="pt-5 scroll-mt-[110px]">
              <div className="flex items-center gap-2 mb-3">
                {cat.emoji && <span className="text-xl">{cat.emoji}</span>}
                <span className="font-black text-base">{cat.nameEn}</span>
              </div>
              <div className="flex flex-col gap-2">
                {catItems.map((item) => {
                  const inCart = cart.find((x) => x.itemId === item.id);
                  return (
                    <div key={item.id} className="grid rounded-xl overflow-hidden" style={{ gridTemplateColumns: "80px 1fr", background: "#111118", border: "1px solid #1a1a2a" }}>
                      <div className="w-[80px] h-[80px] flex items-center justify-center overflow-hidden" style={{ background: "rgba(0,0,0,.2)" }}>
                        {item.images?.[0]
                          ? <img src={item.images[0]} alt={item.nameEn} className="w-full h-full object-cover" />
                          : <span style={{ fontSize: 32 }}>{item.emoji || "🍽️"}</span>
                        }
                      </div>
                      <div className="p-2.5 flex flex-col justify-between">
                        <div>
                          <div className="text-sm font-bold">{item.nameEn}
                            {item.badge && <span className="ms-1.5 text-[0.58rem] font-bold px-1.5 rounded-full" style={{ background: "rgba(201,169,110,.2)", color: "#c9a96e", border: "1px solid rgba(201,169,110,.4)" }}>{item.badge}</span>}
                          </div>
                          <div className="text-xs text-[#666680] line-clamp-1">{item.descEn}</div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm font-black text-[#c9a96e]">{item.price} SAR</span>
                          {inCart ? (
                            <div className="flex items-center gap-1 rounded-lg px-1" style={{ border: "1px solid #c9a96e" }}>
                              <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 font-bold text-[#c9a96e]">−</button>
                              <span className="text-xs font-black w-4 text-center">{inCart.qty}</span>
                              <button onClick={() => addToCart(item.id)} className="w-6 h-6 font-bold text-[#c9a96e]">+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-xl" style={{ background: "#c9a96e" }}>+</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-[472px] mx-auto z-40">
          <button onClick={placeOrder}
            className="w-full flex items-center justify-between rounded-xl px-5 py-3.5 shadow-lg font-bold"
            style={{ background: "#c9a96e", color: "#000" }}>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-black/20 font-black">{cartCount}</span>
              <span>Place Order</span>
            </div>
            <span className="font-black">{cartTotal} SAR</span>
          </button>
        </div>
      )}
    </div>
  );
}
