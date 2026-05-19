"use client";

import React, { useState, useMemo } from "react";
import { useApp }                    from "@/lib/context";
import { useRole }                   from "@/hooks/useRole";
import { useOrdersData }             from "@/hooks/useOrdersData";
import { Card, Badge, Button }       from "@/components/shared/ui";
import { fmtTime }                   from "@/lib/utils";
import type { APIOrder }             from "@/hooks/useOrdersData";

// Status metadata — maps both DB and API status names
// Transitions enforced by role:
//   received→preparing : kitchen (+ owner/manager)
//   preparing→ready    : kitchen (+ owner/manager)
//   ready→delivered    : waiter  (+ owner/manager)
const STATUS_META: Record<string, { labelAr:string; labelEn:string; variant:"info"|"warning"|"success"|"muted"; next:string|null; nextRoles:string[] }> = {
  new:       { labelAr:"جديد",     labelEn:"Received",  variant:"info",    next:"preparing", nextRoles:["owner","manager","kitchen"] },
  prep:      { labelAr:"تحضير",    labelEn:"Preparing", variant:"warning", next:"ready",     nextRoles:["owner","manager","kitchen"] },
  ready:     { labelAr:"جاهز",     labelEn:"Ready",     variant:"success", next:"delivered", nextRoles:["owner","manager","waiter"]  },
  served:    { labelAr:"مُسلَّم",  labelEn:"Delivered", variant:"muted",   next:null,        nextRoles:[] },
  cancelled: { labelAr:"ملغي",     labelEn:"Cancelled", variant:"muted",   next:null,        nextRoles:[] },
  received:  { labelAr:"جديد",     labelEn:"Received",  variant:"info",    next:"preparing", nextRoles:["owner","manager","kitchen"] },
  preparing: { labelAr:"تحضير",    labelEn:"Preparing", variant:"warning", next:"ready",     nextRoles:["owner","manager","kitchen"] },
  delivered: { labelAr:"مُسلَّم",  labelEn:"Delivered", variant:"muted",   next:null,        nextRoles:[] },
};

// Roles that can cancel an active order
const CANCEL_ROLES = ["owner","manager","cashier","waiter"];

function OrderCard({ order, onUpdateStatus }: {
  order: APIOrder;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<boolean>;
}) {
  const { t, state } = useApp();
  const { role } = useRole();
  const [updating, setUpdating] = useState(false);

  const meta = STATUS_META[order.status_raw] ?? STATUS_META[order.status];
  const next = meta?.next ?? null;
  // Check if current role can perform the next transition
  const canAdvance = next && role && (meta?.nextRoles ?? []).includes(role);

  const handleNext = async () => {
    if (!next || !canAdvance) return;
    setUpdating(true);
    await onUpdateStatus(order.id, next);
    setUpdating(false);
  };

  const totalRevenue = order.items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold font-[var(--fe)] text-[0.88rem]">{order.id.slice(-8).toUpperCase()}</div>
          <div className="text-[0.7rem] text-[var(--c2)]">
            {order.table_number ? `${t("طاولة","Table")} ${order.table_number}` : t("طلب مباشر","Direct Order")}
            {" · "}
            {fmtTime(order.created_at, state.lang)}
          </div>
        </div>
        <Badge variant={meta?.variant ?? "info"}>
          {t(meta?.labelAr ?? order.status, meta?.labelEn ?? order.status)}
        </Badge>
      </div>

      {/* Items */}
      <div className="text-[0.76rem] text-[var(--c2)] mb-2.5 space-y-0.5">
        {order.items.map((oi) => (
          <div key={oi.id} className="flex items-center gap-1">
            <span>{oi.emoji}</span>
            <span>{t(oi.name_ar, oi.name_en)}</span>
            <span className="font-[var(--fe)] text-[var(--c3)]">×{oi.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <div className="text-[0.7rem] italic text-[var(--c3)] mt-1">📝 {order.notes}</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[0.9rem] font-black text-[var(--ac)] font-[var(--fe)]">
          {totalRevenue.toFixed(0)} SAR
        </span>
        <div className="flex items-center gap-1.5">
          {/* Cancel button — cashier or waiter on active orders */}
          {["new","prep","ready"].includes(order.status_raw) && role && CANCEL_ROLES.includes(role) && (
            <button onClick={async () => { setUpdating(true); await onUpdateStatus(order.id,"cancelled"); setUpdating(false); }}
              disabled={updating}
              className="px-2 py-1 rounded-[var(--rx)] text-[0.65rem] font-semibold"
              style={{ background:"var(--dgs)", border:"1px solid var(--dg)", color:"var(--dg)" }}>
              {updating ? "⏳" : `✕ ${t("إلغاء","Cancel")}`}
            </button>
          )}
          {/* Advance button — role-gated */}
          {canAdvance ? (
            <Button variant="primary" size="sm" onClick={handleNext} disabled={updating}>
              {updating ? "⏳" : `→ ${t(STATUS_META[next!]?.labelAr ?? next!, STATUS_META[next!]?.labelEn ?? next!)}`}
            </Button>
          ) : next && !["served","cancelled"].includes(order.status_raw) ? (
            <span className="text-[0.65rem] text-[var(--c3)] px-2 py-1 rounded-full border border-[var(--bd)]">
              🔒 {t(STATUS_META[next]?.labelAr ?? next, STATUS_META[next]?.labelEn ?? next)}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

// ── Main OrdersView ───────────────────────────────────────────
type StatusFilter = "all" | "new" | "prep" | "ready" | "served" | "cancelled";

export default function OrdersView() {
  const { t }                              = useApp();
  const [filter, setFilter]                = useState<StatusFilter>("all");
  const { orders, isLoading, error,
          refetch, updateStatus }          = useOrdersData();

  const filtered = useMemo(() => {
    if (filter === "all") return [...orders];
    return orders.filter(o => o.status_raw === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach(o => { c[o.status_raw] = (c[o.status_raw] ?? 0) + 1; });
    return c;
  }, [orders]);

  const filters: { key: StatusFilter; labelAr: string; labelEn: string }[] = [
    { key: "all",       labelAr: "الكل",    labelEn: "All"       },
    { key: "new",       labelAr: "جديد",    labelEn: "Received"  },
    { key: "prep",      labelAr: "تحضير",   labelEn: "Preparing" },
    { key: "ready",     labelAr: "جاهز",    labelEn: "Ready"     },
    { key: "served",    labelAr: "خُدم",    labelEn: "Served"    },
    { key: "cancelled", labelAr: "ملغي",    labelEn: "Cancelled" },
  ];

  return (
    <div className="p-4 md:p-5">
      {/* Filters + refresh */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all"
            style={{
              background:  filter === f.key ? "var(--acs)" : "var(--b2)",
              borderColor: filter === f.key ? "var(--ac)"  : "var(--bd)",
              color:       filter === f.key ? "var(--ac)"  : "var(--c2)",
            }}>
            {t(f.labelAr, f.labelEn)}
            <span className="text-xs font-bold font-[var(--fe)]">{counts[f.key] ?? 0}</span>
          </button>
        ))}
        <button onClick={refetch} disabled={isLoading}
          className="ms-auto w-8 h-8 rounded-full border border-[var(--bd)] flex items-center justify-center hover:border-[var(--ac)] disabled:opacity-50 transition-all">
          {isLoading
            ? <span className="w-3.5 h-3.5 rounded-full border border-[var(--ac)] border-t-transparent animate-spin" />
            : "⟳"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-[var(--dg)] text-center py-4 mb-4 rounded-[var(--rs)]"
          style={{ background:"var(--dgs)", border:"1px solid var(--dg)" }}>
          ⚠️ {error}
          <button onClick={refetch} className="ms-2 underline text-xs">{t("إعادة المحاولة","Retry")}</button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !orders.length && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-[140px] rounded-[var(--r)] bg-[var(--b2)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Orders grid */}
      {!isLoading && filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--c3)] text-sm">
          {t("لا طلبات","No orders")}
          {filter !== "all" && <span> {t("بهذه الحالة","with this status")}</span>}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
