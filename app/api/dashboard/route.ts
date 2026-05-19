// app/api/dashboard/route.ts
// GET /api/dashboard
// Revenue from order_items.quantity * price  (column: price, not unit_price)

import { NextRequest, NextResponse }               from "next/server";
import { getUserContext, unauthorized, forbidden } from "@/lib/getUserContext";
import { createSupabaseServerClient }              from "@/lib/supabase/server";

interface TopItem    { menu_item_id:string; name_ar:string; name_en:string; emoji:string; qty_sold:number; revenue:number; }
interface StatusCount { status:string; count:number; }

export interface DashboardData {
  date: string;
  today:  { orders_count:number; revenue:number; avg_ticket:number; turnover:number; };
  total:  { orders_count:number; revenue:number; items_in_menu:number; table_count:number; };
  active: { count:number; new:number; prep:number; ready:number; };
  hourly_revenue: number[];
  top_items:      TopItem[];
  status_counts:  StatusCount[];
}

const CACHE = { "Cache-Control": "no-store" };

function ok(data: DashboardData) {
  return NextResponse.json({ data, timestamp: new Date().toISOString() }, { status: 200, headers: CACHE });
}
function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = await getUserContext();
  if (!ctx)                      return unauthorized();
  if (!ctx.can("dashboard:read")) return forbidden("dashboard:read permission required");

  const { searchParams } = req.nextUrl;
  const targetDate = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const dayStart   = `${targetDate}T00:00:00.000Z`;
  const dayEnd     = `${targetDate}T23:59:59.999Z`;
  const topLimit   = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 50);

  const supabase = await createSupabaseServerClient();
  const venueId  = ctx.venueId;

  try {
    const [
      todayOrdersRes,     // orders placed today (for count + hourly)
      todayItemsRes,      // order_items for today (for revenue)
      allItemsRes,        // all order_items ever (for total revenue)
      activeOrdersRes,    // active orders right now
      statusCountsRes,    // all orders by status
      tableCountRes,
      itemCountRes,
    ] = await Promise.all([

      // Today's order IDs and timestamps
      supabase
        .from("orders")
        .select("id, status, created_at")
        .eq("venue_id", venueId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd),

      // Today's revenue via order_items (joined through orders)
      supabase
        .from("order_items")
        .select(`
          quantity,
          price,
          menu_item_id,
          orders!inner (
            id,
            venue_id,
            created_at,
            status
          ),
          menu_items (
            name_ar,
            name_en,
            emoji
          )
        `)
        .eq("orders.venue_id", venueId)
        .gte("orders.created_at", dayStart)
        .lte("orders.created_at", dayEnd),

      // All-time revenue
      supabase
        .from("order_items")
        .select("quantity, price, orders!inner(venue_id)")
        .eq("orders.venue_id", venueId),

      // Active right now
      supabase
        .from("orders")
        .select("id, status")
        .eq("venue_id", venueId)
        .in("status", ["new", "prep", "ready"]),

      // Status breakdown
      supabase
        .from("orders")
        .select("status")
        .eq("venue_id", venueId),

      supabase.from("tables").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
    ]);

    // Handle errors
    const errs = [todayOrdersRes.error, todayItemsRes.error, allItemsRes.error,
                  activeOrdersRes.error, statusCountsRes.error].filter(Boolean);
    if (errs.length) {
      console.error("[GET /api/dashboard]", errs[0]!.message);
      return fail("DB_ERROR", errs[0]!.message, 500);
    }

    // ── Today KPIs ──────────────────────────────────────────────
    const todayOrders    = todayOrdersRes.data ?? [];
    const tableCount     = tableCountRes.count  ?? 0;
    const todayItemRows  = todayItemsRes.data   ?? [];

    const todayRevenue = todayItemRows.reduce((s, r) =>
      s + Number(r.quantity ?? 0) * Number(r.price ?? 0), 0);

    const todayCount   = todayOrders.length;
    const avgTicket    = todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0;
    const turnover     = tableCount  > 0 ? parseFloat((todayCount / tableCount).toFixed(2)) : 0;

    // ── All-time totals ─────────────────────────────────────────
    const allItemRows   = allItemsRes.data ?? [];
    const totalRevenue  = allItemRows.reduce((s, r) =>
      s + Number(r.quantity ?? 0) * Number(r.price ?? 0), 0);

    // ── Active ──────────────────────────────────────────────────
    const active = activeOrdersRes.data ?? [];

    // ── Status counts ───────────────────────────────────────────
    const statusMap: Record<string, number> = {};
    for (const o of statusCountsRes.data ?? []) {
      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }

    // ── Hourly revenue + top items from today's order_items ─────
    const hourly    = new Array<number>(24).fill(0);
    const itemAgg: Record<string, { menu_item_id:string; name_ar:string; name_en:string; emoji:string; qty_sold:number; revenue:number }> = {};

    for (const row of todayItemRows) {
      const order    = row.orders     as unknown as { created_at: string } | null;
      const menuItem = row.menu_items as unknown as { name_ar:string; name_en:string; emoji:string } | null;
      if (!order) continue;

      const qty     = Number(row.quantity   ?? 0);
      const price   = Number(row.price ?? 0);
      const lineRev = qty * price;
      const hour    = new Date(order.created_at).getUTCHours();

      hourly[hour] = (hourly[hour] ?? 0) + lineRev;

      const itemId = String(row.menu_item_id);
      if (!itemAgg[itemId]) {
        itemAgg[itemId] = {
          menu_item_id:  itemId,
          name_ar:  menuItem?.name_ar ?? "",
          name_en:  menuItem?.name_en ?? "",
          emoji:    menuItem?.emoji   ?? "",
          qty_sold: 0,
          revenue:  0,
        };
      }
      itemAgg[itemId].qty_sold += qty;
      itemAgg[itemId].revenue  += lineRev;
    }

    const topItems = Object.values(itemAgg)
      .sort((a, b) => b.qty_sold - a.qty_sold || b.revenue - a.revenue)
      .slice(0, topLimit)
      .map((x) => ({ ...x, revenue: Math.round(x.revenue) }));

    const payload: DashboardData = {
      date:    targetDate,
      today:   { orders_count: todayCount, revenue: Math.round(todayRevenue), avg_ticket: avgTicket, turnover },
      total:   { orders_count: (statusCountsRes.data ?? []).length, revenue: Math.round(totalRevenue), items_in_menu: itemCountRes.count ?? 0, table_count: tableCount },
      active:  {
        count: active.length,
        new:   active.filter((o) => o.status === "new").length,
        prep:  active.filter((o) => o.status === "prep").length,
        ready: active.filter((o) => o.status === "ready").length,
      },
      hourly_revenue: hourly,
      top_items:      topItems,
      status_counts:  Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    };

    return ok(payload);
  } catch (err) {
    console.error("[GET /api/dashboard] unexpected:", err);
    return fail("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
