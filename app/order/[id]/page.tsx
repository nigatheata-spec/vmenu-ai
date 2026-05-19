"use client";

// =============================================================
// app/order/[id]/page.tsx
//
// Public order tracking page — no auth required.
// One-time access: once the user closes this page, they cannot
// navigate back to it. Implemented via sessionStorage:
//   - On first load: store orderId in sessionStorage as "visited"
//   - On any subsequent load (same session): show "expired" screen
//   - sessionStorage is cleared when the browser tab/session closes
//
// Polls every 10s while order is active (new/prep/ready).
// Stops polling when order is served or cancelled.
// =============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

type DBStatus = "new" | "prep" | "ready" | "served" | "cancelled";

interface TrackingOrder {
  id:           string;
  table_number: number | null;
  status:       string;
  status_raw:   DBStatus;
  items: { name_ar:string; name_en:string; emoji:string; quantity:number; subtotal:number; }[];
  created_at:   string;
}

const STEPS: { key: DBStatus; ar:string; en:string; icon:string }[] = [
  { key:"new",    ar:"تم الاستلام",  en:"Received",  icon:"📋" },
  { key:"prep",   ar:"قيد التحضير",  en:"Preparing", icon:"👨‍🍳" },
  { key:"ready",  ar:"جاهز للتسليم", en:"Ready",     icon:"✅" },
  { key:"served", ar:"تم التسليم",   en:"Delivered", icon:"🎉" },
];
const STEP_INDEX: Partial<Record<DBStatus, number>> = { new:0, prep:1, ready:2, served:3 };

export default function OrderTrackingPage() {
  const { id } = useParams() as { id: string };
  const [order,    setOrder]    = useState<TrackingOrder | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [expired,  setExpired]  = useState(false);  // page was closed and reopened
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const STORAGE_KEY = `vmenu_order_${id}`;

  // ── One-time access guard ────────────────────────────────────
  // sessionStorage persists only within a single browser tab/session.
  // When the user closes this tab (or navigates away and comes back
  // via history), we show the expired screen.
  //
  // The flag is set to "viewed" when the order is first opened.
  // We distinguish "first open" (flag absent) from "revisit" (flag set).
  // The flag is updated to "closed" when the user explicitly closes
  // the page via the close button — this is the "can't come back" trigger.
  useEffect(() => {
    const flag = sessionStorage.getItem(STORAGE_KEY);
    if (flag === "closed") {
      setExpired(true);
      setLoading(false);
      return;
    }
    // Mark as viewed (first or subsequent visit in same session before closing)
    sessionStorage.setItem(STORAGE_KEY, "viewed");
  }, [STORAGE_KEY]);

  const fetchOrder = useCallback(async () => {
    try {
      const res  = await fetch(`/api/orders/${id}`);
      if (!res.ok) { setError(true); setLoading(false); return; }
      const json = await res.json() as { data: TrackingOrder };
      setOrder(json.data);
      setError(false);
      setLoading(false);

      // Stop polling when terminal state reached
      if (["served","cancelled"].includes(json.data.status_raw)) {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (expired) return;
    fetchOrder();
    pollingRef.current = setInterval(fetchOrder, 10_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchOrder, expired]);

  // Mark closed when user navigates away (visibilitychange or beforeunload)
  useEffect(() => {
    if (expired) return;
    const markClosed = () => {
      if (document.visibilityState === "hidden") {
        sessionStorage.setItem(STORAGE_KEY, "closed");
      }
    };
    document.addEventListener("visibilitychange", markClosed);
    return () => document.removeEventListener("visibilitychange", markClosed);
  }, [STORAGE_KEY, expired]);

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY, "closed");
    // Navigate back or close tab
    if (window.history.length > 1) window.history.back();
    else window.close();
  };

  // ── Expired screen ───────────────────────────────────────────
  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white text-center p-8">
        <div>
          <div className="text-5xl mb-4">🔒</div>
          <div className="text-xl font-black mb-2">Order Closed</div>
          <div className="text-sm text-gray-400 max-w-xs">
            This order tracking page has been closed. For assistance, please contact your waiter.
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <span className="w-10 h-10 rounded-full border-2 border-[#333] border-t-[#c9a96e] animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white text-center p-8">
      <div>
        <div className="text-4xl mb-4">⚠️</div>
        <p className="font-bold mb-1">Order not found</p>
        <p className="text-sm text-gray-400">The order may have been cancelled or the link has expired.</p>
      </div>
    </div>
  );

  // Cancelled screen
  if (order.status_raw === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white text-center p-8">
        <div>
          <div className="text-5xl mb-4">❌</div>
          <div className="text-xl font-black mb-2">Order Cancelled</div>
          <div className="text-sm text-gray-400">This order has been cancelled.</div>
          <button onClick={handleClose}
            className="mt-6 px-6 py-2.5 rounded-full text-sm font-bold border border-gray-600 text-gray-300 hover:border-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STEP_INDEX[order.status_raw] ?? 0;
  const total = order.items.reduce((s,i) => s + i.subtotal, 0);
  const isActive = ["new","prep","ready"].includes(order.status_raw);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-start pt-10 pb-16 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xl font-black mb-1">🧾 {order.status_raw === "served" ? "Order Complete" : "Tracking Order"}</div>
          <div className="text-sm text-gray-400">
            #{order.id.slice(-8).toUpperCase()}
            {order.table_number && ` · Table ${order.table_number}`}
          </div>
          {isActive && (
            <div className="text-[0.65rem] text-gray-600 mt-1 animate-pulse">
              Refreshing every 10 seconds
            </div>
          )}
        </div>

        {/* Progress steps */}
        <div className="relative mb-8">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-[#1a1a2a]" />
          <div className="absolute top-5 left-5 h-0.5 bg-[#c9a96e] transition-all duration-700"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%`, right:"auto" }} />
          <div className="relative flex justify-between">
            {STEPS.map((step, i) => {
              const done    = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all duration-500"
                    style={{
                      background: done ? "#c9a96e" : "#111",
                      border: `2px solid ${done ? "#c9a96e" : "#333"}`,
                      boxShadow: current ? "0 0 16px rgba(201,169,110,.6)" : "none",
                    }}>
                    {step.icon}
                  </div>
                  <div className={`text-[0.62rem] font-bold ${done ? "text-[#c9a96e]" : "text-gray-600"}`}>
                    {step.en}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status card */}
        <div className="rounded-xl p-4 mb-4 text-center"
          style={{ background:"#111118", border: order.status_raw === "served" ? "2px solid #4ade80" : "2px solid #c9a96e" }}>
          <div className="text-3xl mb-1">{STEPS[currentStep]?.icon}</div>
          <div className="text-lg font-black" style={{ color: order.status_raw === "served" ? "#4ade80" : "#c9a96e" }}>
            {STEPS[currentStep]?.en}
          </div>
          <div className="text-sm text-gray-400 mt-0.5">{STEPS[currentStep]?.ar}</div>
          {order.status_raw === "served" && (
            <div className="text-xs text-green-400 mt-2 font-bold">🎉 Enjoy your meal! Bon appétit!</div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-xl p-4 mb-6" style={{ background:"#111118", border:"1px solid #1a1a2a" }}>
          <div className="text-xs text-gray-500 mb-3 font-semibold tracking-wide">YOUR ORDER</div>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{item.emoji}</span>
                  <span>{item.name_en}</span>
                  <span className="text-gray-500">×{item.quantity}</span>
                </div>
                <span className="text-[#c9a96e] font-bold">{item.subtotal} SAR</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-black mt-3 pt-3 border-t border-[#1a1a2a]">
            <span>Total</span>
            <span className="text-[#c9a96e]">{total} SAR</span>
          </div>
        </div>

        {/* Close button — marks the session as closed (can't reopen) */}
        <button onClick={handleClose}
          className="w-full py-3 rounded-xl text-sm font-bold border border-gray-700 text-gray-400 hover:border-gray-500 transition-colors">
          ✕ Close Order Tracking
        </button>
        <p className="text-center text-[0.62rem] text-gray-700 mt-2">
          Once closed, this page cannot be reopened.
        </p>
      </div>
    </div>
  );
}
