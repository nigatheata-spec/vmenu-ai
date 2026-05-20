"use client";

import React, { useMemo }   from "react";
import { useApp }            from "@/lib/context";
import { useDashboardData }  from "@/hooks/useDashboardData";
import { useOrdersData }     from "@/hooks/useOrdersData";
import { useRole }           from "@/hooks/useRole";
import { Card, CardHeader, CardBody } from "@/components/shared/ui";
import { fmtTime, fmtNumber }         from "@/lib/utils";
import {
  ShoppingBag, CurrencyDollar, Receipt, ArrowsClockwise,
  Pulse, ChartLineUp, Circle, Trophy, Chair,
  ArrowClockwise, WarningCircle, ForkKnife,
  type Icon as PhosphorIconType,
} from "@phosphor-icons/react";

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, unit, sub, live, accent }: {
  icon: PhosphorIconType; label: string; value: React.ReactNode;
  unit?: string; sub?: string; live?: boolean; accent?: string;
}) {
  return (
    <Card hover className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--acs)", border: "1px solid var(--bda)" }}>
          <Icon size={15} weight="duotone" color={accent ?? "var(--ac)"} />
        </div>
        {live && (
          <span className="flex items-center gap-1 text-[0.6rem] font-semibold font-[var(--fe)] text-[var(--sc)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--sc)] animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="text-[0.68rem] text-[var(--c2)] mb-0.5 font-medium">{label}</div>
      <div className="font-[var(--fe)] text-[1.6rem] font-black leading-tight text-[var(--c0)]">
        {value}
        {unit && <span className="text-[0.62rem] text-[var(--c2)] font-normal ms-1">{unit}</span>}
      </div>
      {sub && !live && <div className="text-[0.6rem] text-[var(--c3)] mt-0.5">{sub}</div>}
    </Card>
  );
}

// ── Hourly Revenue Chart ──────────────────────────────────────
function HourlyChartRaw({ hourly }: { hourly: number[] }) {
  const maxH = Math.max(...hourly, 1);
  return (
    <div className="flex items-end gap-0.5 h-[150px]">
      {hourly.map((v, i) => {
        const pct   = Math.max(3, (v / maxH) * 100);
        const color = v > maxH * 0.7 ? "var(--ac)" : v > maxH * 0.3 ? "var(--in)" : "var(--b3)";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full rounded-t-sm min-h-[3px] origin-bottom"
              style={{ height: `${pct}%`, background: color,
                animation: `barGrow 0.8s cubic-bezier(.16,1,.3,1) ${i * 25}ms both` }}
              title={`${i}:00 · ${v} SAR`} />
            <span className="text-[0.55rem] text-[var(--c3)] font-[var(--fe)]">
              {i % 3 === 0 ? i : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Top Dishes ────────────────────────────────────────────────
function TopDishesAPI({ items }: { items: { menu_item_id:string; name_ar:string; name_en:string; emoji:string; qty_sold:number; revenue:number }[] }) {
  const { t } = useApp();
  if (!items.length) return <div className="text-center py-8 text-[var(--c3)]">{t("لا بيانات","No data")}</div>;
  const maxRev = Math.max(...items.map(x => x.revenue), 1);
  const medalColors = ["var(--ac)", "var(--c1)", "#cd7f32"];
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((x, i) => (
        <div key={x.menu_item_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
          <span className="w-5 text-[0.72rem] font-black text-center font-[var(--fe)]"
            style={{ color: medalColors[i] ?? "var(--c3)" }}>
            {i + 1}
          </span>
          <div className="w-6 h-6 rounded-md bg-[var(--b3)] flex items-center justify-center shrink-0">
            <ForkKnife size={12} weight="regular" color="var(--c2)" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.8rem] font-bold">{t(x.name_ar, x.name_en)}</div>
            <div className="text-[0.65rem] text-[var(--c2)] font-[var(--fe)]">{x.qty_sold} {t("طلب","orders")}</div>
          </div>
          <div className="w-12 h-1 rounded bg-[var(--b3)] overflow-hidden">
            <div className="h-full bg-[var(--ac)]" style={{ width: `${(x.revenue / maxRev) * 100}%` }} />
          </div>
          <span className="text-[0.78rem] font-bold text-[var(--ac)] font-[var(--fe)]">{fmtNumber(x.revenue)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Live Orders Feed — real API data ──────────────────────────
// Shows orders sorted newest-first with:
//   table id + table number · order ID
//   items in small font
//   status indicator (🟢 ready/delivered, 🟡 new/prep, ⚪ cancelled/served)
//   total price · time
const ORDER_STATUS_DOT: Record<string, { color: string; labelAr: string; labelEn: string }> = {
  new:       { color: "var(--wr)", labelAr: "جديد",  labelEn: "Received"  },
  prep:      { color: "var(--wr)", labelAr: "تحضير", labelEn: "Preparing" },
  ready:     { color: "var(--sc)", labelAr: "جاهز",  labelEn: "Ready"     },
  served:    { color: "var(--sc)", labelAr: "تسليم", labelEn: "Delivered" },
  cancelled: { color: "var(--c3)", labelAr: "ملغي",  labelEn: "Cancelled" },
};

function LiveOrdersFeed() {
  const { t, state } = useApp();
  // Use real orders from API hook — not state.orders (mock)
  const { orders, isLoading } = useOrdersData();

  // Sort newest-first (API already returns desc but ensure it)
  const sorted = useMemo(() =>
    [...orders].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 30),
    [orders]
  );

  if (isLoading && !orders.length) {
    return (
      <div className="flex flex-col gap-1.5">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-[var(--rs)] bg-[var(--b2)] animate-pulse" />)}
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="text-center py-7 text-[var(--c3)] text-sm">
        {t("لا طلبات", "No orders yet")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto
                    [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--b4)] [&::-webkit-scrollbar-thumb]:rounded">
      {sorted.map(order => {
        const meta = ORDER_STATUS_DOT[order.status_raw] ?? ORDER_STATUS_DOT.new;
        const total = order.items.reduce((s, i) => s + i.subtotal, 0);

        return (
          <div key={order.id}
            className="px-2.5 py-2 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
            {/* Row 1: status dot · table · order ID · time · total */}
            <div className="flex items-center gap-1.5 mb-1">
              {/* Status dot */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: meta.color }}
                title={t(meta.labelAr, meta.labelEn)}
              />
              {/* Table info */}
              <span className="font-bold text-[0.75rem] font-[var(--fe)] flex-shrink-0">
                {order.table_number
                  ? `${t("ط","T")}${order.table_number}`
                  : "—"
                }
              </span>
              {/* Order ID */}
              <span className="text-[0.68rem] text-[var(--c2)] font-[var(--fe)] truncate flex-1 min-w-0">
                · {order.id.slice(-8).toUpperCase()}
              </span>
              {/* Time */}
              <span className="text-[0.6rem] text-[var(--c3)] font-[var(--fe)] flex-shrink-0">
                {fmtTime(order.created_at, state.lang)}
              </span>
              {/* Total */}
              <span className="text-[0.72rem] font-black text-[var(--ac)] font-[var(--fe)] flex-shrink-0">
                {fmtNumber(total)} SAR
              </span>
            </div>
            {/* Row 2: items in small font */}
            <div className="text-[0.62rem] text-[var(--c2)] leading-relaxed truncate ps-3.5">
              {order.items.map((oi, idx) =>
                `${oi.emoji || ""} ${t(oi.name_ar, oi.name_en)} ×${oi.quantity}${idx < order.items.length - 1 ? " · " : ""}`
              ).join("")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tables Row — horizontal scroll ────────────────────────────
// Fetches table status directly from /api/tables/numbers for ALL roles
// (no tables:read required) and polls every 15s for live status.
// Uses cache:"no-store" so every user sees the same real-time data.
function TablesGrid({ onTableClick }: { onTableClick: () => void }) {
  const { t, state } = useApp();

  type TableStatus = "active" | "waiting" | "free";
  interface TableRow { id: string; table_number: number; status: TableStatus; }

  const [tables,    setTables]    = React.useState<TableRow[]>([]);
  const [loading,   setLoading]   = React.useState(true);

  const fetchTables = React.useCallback(async () => {
    try {
      // Use the status-aware tables endpoint — returns real status from DB.
      // Falls back to /api/tables/numbers (no status) if the user lacks tables:read.
      const res = await fetch("/api/tables", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json() as { data?: { id:string; table_number:number; status:string }[] };
        setTables((j.data ?? []).map(r => ({
          id:           r.id,
          table_number: r.table_number,
          status:       (r.status as TableStatus) ?? "free",
        })));
      } else {
        // Fallback for roles without tables:read — no status info
        const r2 = await fetch("/api/tables/numbers", { cache: "no-store" });
        if (r2.ok) {
          const j2 = await r2.json() as { data?: { id:string; table_number:number }[] };
          setTables((j2.data ?? []).map(r => ({ id: r.id, table_number: r.table_number, status: "free" as TableStatus })));
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!state.auth?.role) return;
    fetchTables();
    const id = setInterval(fetchTables, 15_000);
    return () => clearInterval(id);
  }, [fetchTables, state.auth?.role]);

  const colorMap: Record<TableStatus, { bg:string; border:string; text:string; dot:string }> = {
    active:  { bg:"var(--scs)", border:"var(--sc)", text:"var(--sc)", dot:"var(--sc)"  },
    waiting: { bg:"var(--wrs)", border:"var(--wr)", text:"var(--wr)", dot:"var(--wr)"  },
    free:    { bg:"var(--b2)",  border:"var(--bd)", text:"var(--c2)", dot:"var(--bd2)" },
  };

  if (loading && !tables.length) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex-shrink-0 w-[64px] h-[76px] rounded-[var(--rs)] bg-[var(--b2)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tables.length) {
    return <div className="text-center py-4 text-[var(--c3)] text-sm">{t("لا طاولات","No tables")}</div>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tables.map(tbl => {
        const c = colorMap[tbl.status] ?? colorMap.free;
        return (
          <button key={tbl.id} onClick={onTableClick}
            className="flex-shrink-0 flex flex-col items-center justify-between rounded-[var(--rs)] px-3 py-2.5 transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ minWidth:"64px", background:c.bg, border:`1px solid ${c.border}` }}>
            <span className="text-[0.6rem] font-semibold" style={{ color:c.text }}>
              {t("طاولة","Table")}
            </span>
            <span className="text-[1.35rem] font-black font-[var(--fe)] leading-none my-1" style={{ color:c.text }}>
              {tbl.table_number}
            </span>
            <span className="w-2 h-2 rounded-full" style={{ background:c.dot }} />
          </button>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
interface DashboardProps { onTableClick: () => void; }

export default function Dashboard({ onTableClick }: DashboardProps) {
  const { state, t } = useApp();
  const { data: apiData, isLoading: apiLoading, error: apiError, refetch, lastUpdated } = useDashboardData();

  // KPI values — real API first, context mock as fallback (trial mode)
  const today = useMemo(() =>
    state.orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()),
    [state.orders]
  );
  const contextRev    = today.reduce((s, o) => s + o.total, 0);
  const contextActive = state.orders.filter(o => ["new","prep","ready"].includes(o.status)).length;
  const contextTurn   = state.tables.length ? (today.length / state.tables.length).toFixed(1) : "0";

  const ordersToday = apiData?.today.orders_count ?? today.length;
  const revenue     = apiData?.today.revenue       ?? contextRev;
  const avgTicket   = apiData?.today.avg_ticket    ?? (today.length ? Math.round(contextRev / today.length) : 0);
  const turnover    = apiData?.today.turnover      ?? Number(contextTurn);
  const activeCount = apiData?.active.count        ?? contextActive;

  const hourlyRevenue = useMemo(() => {
    if (apiData?.hourly_revenue) return apiData.hourly_revenue;
    const h = new Array(24).fill(0);
    state.orders.forEach(o => { h[new Date(o.createdAt).getHours()] += o.total; });
    return h;
  }, [apiData, state.orders]);

  return (
    <div className="p-4 md:p-5 space-y-3.5">

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {apiError && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ background:"var(--wrs)", border:"1px solid var(--wr)", color:"var(--wr)" }}>
              <WarningCircle size={12} weight="fill" />
              {t("خطأ في تحميل البيانات","Error loading data")}
              <button onClick={refetch} className="underline ms-1">{t("إعادة المحاولة","Retry")}</button>
            </div>
          )}
          {lastUpdated && !apiError && (
            <span className="text-[0.68rem] text-[var(--c3)]">
              {t("آخر تحديث","Updated")} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button onClick={refetch} disabled={apiLoading}
          className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--bd)] text-[var(--c2)] hover:border-[var(--ac)] hover:text-[var(--ac)] transition-all disabled:opacity-50">
          {apiLoading
            ? <span className="w-3 h-3 rounded-full border border-[var(--ac)] border-t-transparent animate-spin" />
            : <ArrowClockwise size={13} weight="regular" />}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <KpiCard icon={ShoppingBag} label={t("الطلبات اليوم","Orders Today")}
          value={ordersToday}
          sub={`${t("الكل","All")}: ${apiData?.total.orders_count ?? "—"}`} />
        <KpiCard icon={CurrencyDollar} label={t("الإيرادات اليوم","Revenue Today")}
          value={fmtNumber(revenue)} unit="SAR"
          sub={`${t("الكل","All")}: ${fmtNumber(apiData?.total.revenue ?? 0)}`} />
        <KpiCard icon={Receipt} label={t("متوسط الفاتورة","Avg Ticket")}
          value={avgTicket} unit="SAR" />
        <KpiCard icon={ArrowsClockwise} label={t("دوران الطاولات","Turnover")}
          value={typeof turnover === "number" && !isNaN(turnover) ? turnover.toFixed(1) : turnover} unit="x" />
        <KpiCard icon={Pulse} label={t("طلبات نشطة","Active")}
          value={<span className="text-[var(--sc)]">{activeCount}</span>}
          live accent="var(--sc)" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
        <Card>
          <CardHeader>
            <span className="text-sm font-bold flex items-center gap-1.5">
              <ChartLineUp size={14} weight="duotone" color="var(--ac)" />
              {t("الإيرادات بالساعة","Hourly Revenue")}
            </span>
          </CardHeader>
          <CardBody>
            <HourlyChartRaw hourly={hourlyRevenue} />
          </CardBody>
        </Card>

        {/* Live Orders — real Supabase data via useOrdersData */}
        <Card>
          <CardHeader>
            <span className="text-sm font-bold flex items-center gap-1.5">
              <Circle size={8} weight="fill" color="var(--sc)" className="animate-pulse" />
              {t("الطلبات الحية","Live Orders")}
            </span>
          </CardHeader>
          <CardBody className="p-2">
            <LiveOrdersFeed />
          </CardBody>
        </Card>
      </div>

      {/* Top Dishes */}
      <Card>
        <CardHeader>
          <span className="text-sm font-bold flex items-center gap-1.5">
            <Trophy size={14} weight="duotone" color="var(--ac)" />
            {t("الأطباق الأكثر طلباً","Top Dishes")}
          </span>
        </CardHeader>
        <CardBody>
          {apiData?.top_items.length
            ? <TopDishesAPI items={apiData.top_items} />
            : <div className="text-center py-8 text-[var(--c3)] text-sm">{t("لا بيانات","No data")}</div>
          }
        </CardBody>
      </Card>

      {/* Tables */}
      <Card>
        <CardHeader>
          <span className="text-sm font-bold flex items-center gap-1.5">
            <Chair size={14} weight="duotone" color="var(--ac)" />
            {t("الطاولات","Tables")}
          </span>
          <div className="flex gap-3 text-[0.68rem] text-[var(--c2)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--sc)]" />{t("مشغولة","Active")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--wr)]" />{t("تنتظر","Wait")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--bd2)]" />{t("فارغة","Free")}
            </span>
          </div>
        </CardHeader>
        <CardBody className="px-2 py-3">
          <TablesGrid onTableClick={onTableClick} />
        </CardBody>
      </Card>

    </div>
  );
}
