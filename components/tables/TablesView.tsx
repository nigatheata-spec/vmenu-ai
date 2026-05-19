"use client";

import React, { useState, useCallback }  from "react";
import { useApp }                         from "@/lib/context";
import { useRole }                        from "@/hooks/useRole";
import { useTablesData }                  from "@/hooks/useTablesData";
import { useOrdersData }                  from "@/hooks/useOrdersData";
import { Card, Button, Modal }            from "@/components/shared/ui";
import type { APITable }                  from "@/hooks/useTablesData";
import type { APIOrder }                  from "@/hooks/useOrdersData";

// ── QR Display ────────────────────────────────────────────────
function QRDisplay({ table }: { table: APITable }) {
  const src = table.qr_url ?? table.qr_data_url;
  if (src) {
    return <img src={src} alt={`QR T${table.table_number}`}
      className="w-[140px] h-[140px] rounded-[var(--rs)] mx-auto mb-2.5 object-contain bg-white" />;
  }
  return (
    <div className="w-[140px] h-[140px] bg-white rounded-[var(--rs)] p-2 mx-auto mb-2.5
                    flex items-center justify-center text-black text-xs font-mono text-center">
      <div><div className="text-2xl mb-1">▩</div><div className="font-bold">Table {table.table_number}</div></div>
    </div>
  );
}

// ── Table Orders Modal — monitor all orders for this table ────
function TableOrdersModal({ table, orders, onClose, onUpdateStatus }: {
  table: APITable;
  orders: APIOrder[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<boolean>;
}) {
  const { t } = useApp();
  const { role } = useRole();
  const [updating, setUpdating] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
    new:    { ar: "جديد",     en: "Received",  color: "var(--in)" },
    prep:   { ar: "تحضير",    en: "Preparing", color: "var(--wr)" },
    ready:  { ar: "جاهز",     en: "Ready",     color: "var(--sc)" },
    served: { ar: "مُسلَّم",  en: "Delivered", color: "var(--c3)" },
  };

  const tableOrders = orders
    .filter(o => o.table_id === table.id)
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleAction = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    await onUpdateStatus(orderId, newStatus);
    setUpdating(null);
  };

  return (
    <Modal open onClose={onClose}
      title={`🪑 ${t("طاولة","Table")} ${table.table_number} — ${t("الطلبات","Orders")}`}
      maxWidth="480px"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {tableOrders.length === 0 ? (
          <div className="text-center py-8 text-[var(--c3)] text-sm">
            {t("لا طلبات لهذه الطاولة","No orders for this table")}
          </div>
        ) : tableOrders.map(order => {
          const meta = STATUS_LABELS[order.status_raw] ?? STATUS_LABELS.new;
          const canDeliver = order.status_raw === "ready" && (role === "waiter" || role === "owner" || role === "manager");
          const canCancel  = ["new","prep"].includes(order.status_raw) && (role === "cashier" || role === "owner" || role === "manager");

          return (
            <div key={order.id} className="p-3 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-sm font-[var(--fe)]">{order.id.slice(-8).toUpperCase()}</div>
                  <div className="text-xs text-[var(--c2)]">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:`${meta.color}20`, color:meta.color, border:`1px solid ${meta.color}40` }}>
                  {t(meta.ar, meta.en)}
                </span>
              </div>
              <div className="text-xs text-[var(--c2)] space-y-0.5 mb-2">
                {order.items.map((oi,i) => (
                  <div key={i}>{oi.emoji} {t(oi.name_ar,oi.name_en)} ×{oi.quantity}</div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-[var(--ac)] font-[var(--fe)]">
                  {order.items.reduce((s,i)=>s+i.subtotal,0)} SAR
                </span>
                <div className="flex gap-1.5">
                  {canCancel && (
                    <button
                      onClick={() => handleAction(order.id, "cancelled")}
                      disabled={updating === order.id}
                      className="px-2.5 py-1 rounded-[var(--rx)] text-xs font-semibold"
                      style={{ background:"var(--dgs)", border:"1px solid var(--dg)", color:"var(--dg)" }}>
                      {updating === order.id ? "⏳" : `✕ ${t("إلغاء","Cancel")}`}
                    </button>
                  )}
                  {canDeliver && (
                    <button
                      onClick={() => handleAction(order.id, "delivered")}
                      disabled={updating === order.id}
                      className="px-2.5 py-1 rounded-[var(--rx)] text-xs font-bold text-black"
                      style={{ background:"var(--sc)" }}>
                      {updating === order.id ? "⏳" : `✓ ${t("تسليم","Deliver")}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Table Card ────────────────────────────────────────────────
function TableCard({ table, activeOrderCount, canManage, onViewQr, onDelete, onMarkBusy, onMarkFree, onMonitor }: {
  table: APITable;
  activeOrderCount: number;
  canManage:  boolean;
  onViewQr:   () => void;
  onDelete:   () => void;
  onMarkBusy: () => void;
  onMarkFree: () => void;
  onMonitor:  () => void;
}) {
  const { t } = useApp();
  const { isWaiter } = useRole();

  const statusColor = { active: "var(--sc)", waiting: "var(--wr)", free: "var(--c3)" };
  const statusIcon  = { active: "🟢", waiting: "🟡", free: "⚪" };
  const statusLabel = { active: { ar:"مشغولة",en:"Busy" }, waiting: { ar:"تنتظر",en:"Waiting" }, free: { ar:"فارغة",en:"Free" } };

  const color = statusColor[table.status];
  const slabel = statusLabel[table.status];

  return (
    <Card hover className="p-3.5 text-center">
      <QRDisplay table={table} />

      <div className="text-[0.66rem] text-[var(--c2)] font-[var(--fe)] mb-0.5">
        {t("رقم","Table")} {table.table_number}
      </div>
      <div className="text-[1.05rem] font-black mb-0.5">
        {table.name || `${t("طاولة","Table")} ${table.table_number}`}
      </div>

      {/* Status badge */}
      <div className="flex justify-center mb-2">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{ background:`${color}18`, color, border:`1px solid ${color}35` }}>
          {statusIcon[table.status]} {t(slabel.ar, slabel.en)}
          {activeOrderCount > 0 && ` · ${activeOrderCount} ${t("طلب","orders")}`}
        </span>
      </div>

      {/* Waiter actions — mark table busy/free */}
      {isWaiter && (
        <div className="mb-2">
          {table.status === "free" ? (
            <button onClick={onMarkBusy}
              className="w-full py-1 rounded-[var(--rx)] text-[0.68rem] font-semibold mb-1"
              style={{ background:"var(--wrs)", border:"1px solid var(--wr)", color:"var(--wr)" }}>
              🟡 {t("تعيين مشغولة","Mark Busy")}
            </button>
          ) : (
            <button onClick={onMarkFree}
              className="w-full py-1 rounded-[var(--rx)] text-[0.68rem] font-semibold mb-1"
              style={{ background:"var(--b2)", border:"1px solid var(--bd)" }}>
              ⚪ {t("تعيين فارغة","Mark Free")}
            </button>
          )}
        </div>
      )}

      {/* Monitor orders button */}
      {activeOrderCount > 0 && (
        <button onClick={onMonitor}
          className="w-full py-1 rounded-[var(--rx)] text-[0.68rem] font-bold mb-2 animate-pulse"
          style={{ background:"var(--acs)", border:"1px solid var(--ac)", color:"var(--ac)" }}>
          📋 {t("متابعة الطلبات","Monitor Orders")} ({activeOrderCount})
        </button>
      )}

      {/* Footer actions */}
      <div className="flex gap-1">
        <button onClick={onViewQr}
          className="flex-1 py-1 rounded-[var(--rx)] text-[0.68rem] font-semibold bg-[var(--ac)] text-black">
          👁 QR
        </button>
        <a href={table.menu_url} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-1 rounded-[var(--rx)] text-[0.68rem] font-semibold text-center bg-[var(--b2)] border border-[var(--bd)] hover:border-[var(--ac)] transition-colors">
          🔗 {t("فتح","Open")}
        </a>
{canManage && (
          <button onClick={onDelete}
            className="flex-1 py-1 rounded-[var(--rx)] text-[0.68rem] text-[var(--dg)] bg-[var(--b2)] border border-[var(--bd)] hover:border-[var(--dg)] transition-colors">
            🗑
          </button>
        )}
      </div>
    </Card>
  );
}

// ── QR Modal ──────────────────────────────────────────────────
function QRModal({ table, onClose, onRegenerate }: {
  table: APITable | null;
  onClose: () => void;
  onRegenerate: (id: string) => Promise<unknown>;
}) {
  const { t } = useApp();
  const [regen, setRegen] = useState(false);
  if (!table) return null;

  const src = table.qr_url ?? table.qr_data_url;

  return (
    <Modal open onClose={onClose}
      title={`📱 QR — ${t("طاولة","Table")} ${table.table_number}`}
      maxWidth="380px"
      footer={
        <>
          <button onClick={() => { if (!src) return; const a=document.createElement("a"); a.href=src; a.download=`table-${table.table_number}-qr.png`; a.click(); }}
            disabled={!src} className="flex-1 py-2.5 rounded-[var(--rs)] text-sm font-bold bg-[var(--ac)] text-black disabled:opacity-50">
            💾 {t("تحميل","Download")}
          </button>
          <button onClick={async () => { setRegen(true); await onRegenerate(table.id); setRegen(false); }}
            disabled={regen} className="flex-1 py-2.5 rounded-[var(--rs)] text-sm font-semibold bg-[var(--b2)] border border-[var(--bd2)]">
            {regen ? "⏳" : "🔄"} {t("تجديد","Regen")}
          </button>
        </>
      }
    >
      <div className="text-center">
        <div className="w-[220px] h-[220px] mx-auto mb-3 bg-white rounded-[var(--r)] flex items-center justify-center overflow-hidden">
          {src ? <img src={src} alt="QR" className="w-full h-full object-contain" />
               : <div className="text-black text-center"><div className="text-4xl">▩</div><div className="text-xs mt-1">Generating…</div></div>}
        </div>
        <div className="text-[0.66rem] text-[var(--c2)] font-[var(--fe)] py-1.5 px-3 bg-[var(--b2)] rounded-[var(--rx)] break-all">
          {table.menu_url}
        </div>
      </div>
    </Modal>
  );
}

// ── Add Table Modal ───────────────────────────────────────────
function AddTableModal({ onClose, onAdd, existingNumbers }: {
  onClose: () => void;
  onAdd: (num: number, name?: string, seats?: number) => Promise<void>;
  existingNumbers: number[];
}) {
  const { t } = useApp();
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("4");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const nextNum = Math.max(0, ...existingNumbers) + 1;
  const ic = "w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)] px-3 py-2 text-sm outline-none focus:border-[var(--ac)]";

  const handleAdd = async () => {
    const n = parseInt(num || String(nextNum));
    if (!n || n < 1) { setErr("Table number must be a positive integer"); return; }
    if (existingNumbers.includes(n)) { setErr(`Table ${n} already exists`); return; }
    setSaving(true); setErr("");
    await onAdd(n, name.trim() || undefined, parseInt(seats) || 4);
    setSaving(false); onClose();
  };

  return (
    <Modal open onClose={onClose} title={`➕ ${t("طاولة جديدة","New Table")}`} maxWidth="360px"
      footer={
        <>
          <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-[var(--rs)] text-sm font-bold bg-[var(--ac)] text-black disabled:opacity-60">
            {saving ? "⏳" : `✓ ${t("إضافة","Add")}`}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-[var(--rs)] text-sm font-semibold bg-[var(--b2)] border border-[var(--bd2)]">
            {t("إلغاء","Cancel")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {err && <div className="text-xs text-[var(--dg)] px-3 py-2 rounded-[var(--rx)]" style={{ background:"var(--dgs)", border:"1px solid var(--dg)" }}>⚠️ {err}</div>}
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("رقم الطاولة","Table Number")} <span className="text-[var(--c3)]">(next: {nextNum})</span></label>
          <input type="number" value={num} onChange={e => setNum(e.target.value)} placeholder={String(nextNum)} className={ic} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("الاسم (اختياري)","Name (optional)")}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t("VIP، تراس…","VIP, Terrace…")} className={ic} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("عدد المقاعد","Seats")}</label>
          <input type="number" value={seats} onChange={e => setSeats(e.target.value)} min="1" max="20" className={ic} />
        </div>
        <div className="text-xs text-[var(--c2)] px-3 py-2 rounded-[var(--rx)]" style={{ background:"var(--b3)", border:"1px solid var(--bd)" }}>
          ℹ️ {t("سيتم توليد QR تلقائياً","QR will be auto-generated")}
        </div>
      </div>
    </Modal>
  );
}

// ── Waiter Station — quick table status changer ──────────────
function WaiterStation({ tables, onChangeStatus }: {
  tables: APITable[];
  onChangeStatus: (id: string, status: APITable["status"]) => void;
}) {
  const { t } = useApp();

  const STATUS_OPTIONS: { value: APITable["status"]; labelAr: string; labelEn: string; color: string; icon: string }[] = [
    { value: "free",    labelAr: "فارغة",    labelEn: "Free",     color: "var(--c3)",  icon: "⚪" },
    { value: "active",  labelAr: "مشغولة",   labelEn: "Busy",     color: "var(--sc)",  icon: "🟢" },
    { value: "waiting", labelAr: "محجوزة",   labelEn: "Reserved", color: "var(--wr)",  icon: "🟡" },
  ];

  return (
    <div>
      <div className="text-xs text-[var(--c2)] mb-3">
        {t("اضغط على الحالة لتغييرها", "Tap a status button to update the table")}
      </div>
      <div className="flex flex-col gap-2">
        {tables.map(table => (
          <div key={table.id}
            className="flex items-center justify-between gap-2 px-3.5 py-3 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
            <div>
              <div className="font-bold text-sm">
                {table.name || `${t("طاولة","Table")} ${table.table_number}`}
              </div>
              <div className="text-xs text-[var(--c2)] font-[var(--fe)]">
                {t("رقم","#")}{table.table_number} · {table.seats} {t("مقاعد","seats")}
              </div>
            </div>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => onChangeStatus(table.id, opt.value)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={{
                    background:  table.status === opt.value ? `${opt.color}20` : "var(--b3)",
                    borderColor: table.status === opt.value ? opt.color : "var(--bd)",
                    color:       table.status === opt.value ? opt.color : "var(--c3)",
                    transform:   table.status === opt.value ? "scale(1.05)" : "scale(1)",
                  }}>
                  {opt.icon} {t(opt.labelAr, opt.labelEn)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main TablesView ───────────────────────────────────────────
export default function TablesView() {
  const { t } = useApp();
  const { can, isWaiter } = useRole();
  const { tables, isLoading, error, createTable, deleteTable, regenerateQR, updateStatus } = useTablesData();
  const { orders, updateStatus: updateOrderStatus } = useOrdersData();
  const [qrTable,    setQrTable]    = useState<APITable | null>(null);
  const [monitorTable, setMonitorTable] = useState<APITable | null>(null);
  const [showAdd,    setShowAdd]    = useState(false);
  // Waiter view: default to station mode for quick status changes
  const [viewMode,   setViewMode]   = useState<"grid"|"station">(isWaiter ? "station" : "grid");

  // Count active (non-served) orders per table UUID
  const activeOrdersByTable = orders.reduce<Record<string, number>>((acc, o) => {
    if (o.table_id && o.status_raw !== "served") {
      acc[o.table_id] = (acc[o.table_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  const handleDelete = async (table: APITable) => {
    if (!confirm(t(`حذف طاولة ${table.table_number}؟`,`Delete Table ${table.table_number}?`))) return;
    const err = await fetch(`/api/tables/${table.id}`, { method: "DELETE" }).then(r=>r.json()) as {code?:string; message?:string};
    if (err.code === "CONFLICT") {
      alert(t(err.message ?? "لا يمكن الحذف","Cannot delete — active orders exist"));
      return;
    }
    await deleteTable(table.id);
  };

  const handleMarkBusy = (table: APITable) => updateStatus(table.id, "active");
  const handleMarkFree = (table: APITable) => updateStatus(table.id, "free");

  return (
    <div className="p-4 md:p-5">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <div className="text-[1.05rem] font-black">{t("إدارة الطاولات","Tables Manager")}</div>
          <div className="text-[0.76rem] text-[var(--c2)] mt-0.5">
            {tables.length} {t("طاولة","tables")} · {t("يتحدث كل 15 ثانية","auto-refresh 15s")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode tabs */}
          <div className="flex rounded-[var(--rs)] border border-[var(--bd)] overflow-hidden">
            {([
              { key:"grid",    icon:"⊞", labelAr:"عرض",      labelEn:"Grid" },
              { key:"station", icon:"🏷", labelAr:"المحطة",   labelEn:"Station" },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setViewMode(tab.key)}
                className="px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: viewMode === tab.key ? "var(--acs)" : "var(--b2)",
                  color:      viewMode === tab.key ? "var(--ac)"  : "var(--c2)",
                }}>
                {tab.icon} {t(tab.labelAr, tab.labelEn)}
              </button>
            ))}
          </div>
          {can("tables:manage") && (
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
              + {t("طاولة","Table")}
            </Button>
          )}
        </div>
      </div>

      {/* States */}
      {isLoading && !tables.length && (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {[1,2,3,4].map(i => <div key={i} className="h-[300px] rounded-[var(--r)] bg-[var(--b2)] animate-pulse" />)}
        </div>
      )}
      {error && <div className="text-sm text-[var(--dg)] text-center py-8">⚠️ {error}</div>}

      {/* Station view — waiter quick-status panel */}
      {!isLoading && !error && tables.length > 0 && viewMode === "station" && (
        <WaiterStation
          tables={tables}
          onChangeStatus={(id, status) => updateStatus(id, status)}
        />
      )}

      {/* Grid view */}
      {!isLoading && !error && tables.length > 0 && viewMode === "grid" && (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              activeOrderCount={activeOrdersByTable[table.id] ?? 0}
              canManage={can("tables:manage")}
              onViewQr={() => setQrTable(table)}
              onDelete={() => handleDelete(table)}
              onMarkBusy={() => handleMarkBusy(table)}
              onMarkFree={() => handleMarkFree(table)}
              onMonitor={() => setMonitorTable(table)}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && tables.length === 0 && (
        <div className="text-center py-16 text-[var(--c3)] text-sm">
          {t("لا طاولات بعد","No tables yet")}
        </div>
      )}

      {/* Modals */}
      <QRModal table={qrTable} onClose={() => setQrTable(null)} onRegenerate={regenerateQR} />

      {monitorTable && (
        <TableOrdersModal
          table={monitorTable}
          orders={orders}
          onClose={() => setMonitorTable(null)}
          onUpdateStatus={updateOrderStatus}
        />
      )}

      {showAdd && (
        <AddTableModal
          onClose={() => setShowAdd(false)}
          onAdd={async (num, name, seats) => { await createTable(num, name, seats); }}
          existingNumbers={tables.map(t => t.table_number)}
        />
      )}
    </div>
  );
}
