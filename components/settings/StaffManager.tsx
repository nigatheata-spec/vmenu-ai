"use client";

// =============================================================
// components/settings/StaffManager.tsx
//
// Owner-only UI to:
//   - View all staff members
//   - Add new staff (email + password + role)
//   - Remove staff
//   - Change staff roles
//
// Calls: GET/POST /api/staff, DELETE/PATCH /api/staff/:id
// =============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/context";
import { ROLE_META } from "@/lib/rbac";
import type { StaffRole } from "@/types/supabase";

// ── Types ─────────────────────────────────────────────────────
interface StaffMember {
  id:       string;
  user_id:  string;
  email:    string;
  name:     string;
  role:     StaffRole;
}

// Roles an owner can assign
const ASSIGNABLE_ROLES: StaffRole[] = ["manager", "kitchen", "waiter", "cashier", "marketing"];

// ── Add Staff Form ────────────────────────────────────────────
function AddStaffForm({ onAdded }: { onAdded: () => void }) {
  const { t } = useApp();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [role,     setRole]     = useState<StaffRole>("waiter");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/staff", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, name, role }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to add staff member");
        return;
      }

      setSuccess(true);
      setEmail(""); setPassword(""); setName(""); setRole("waiter");
      setTimeout(() => { setSuccess(false); onAdded(); }, 1500);
    } catch {
      setError(t("خطأ في الاتصال", "Connection error"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)] px-3 py-2 text-sm text-[var(--c0)] outline-none focus:border-[var(--ac)] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-[var(--b2)] rounded-[var(--r)] border border-[var(--bd)]">
      <div className="text-sm font-bold mb-2">
        ➕ {t("إضافة عضو جديد", "Add Staff Member")}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-[var(--rx)] text-xs text-[var(--dg)]"
          style={{ background: "var(--dgs)", border: "1px solid var(--dg)" }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="px-3 py-2 rounded-[var(--rx)] text-xs text-[var(--sc)]"
          style={{ background: "var(--scs)", border: "1px solid var(--sc)" }}>
          ✓ {t("تمت الإضافة!", "Added successfully!")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("الاسم الكامل", "Full Name")}</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            placeholder={t("أحمد محمد", "John Doe")} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("الدور", "Role")}</label>
          <select value={role} onChange={e => setRole(e.target.value as StaffRole)} className={inputCls}>
            {ASSIGNABLE_ROLES.map(r => (
              <option key={r} value={r}>
                {t(ROLE_META[r].labelAr, ROLE_META[r].labelEn)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--c2)] block mb-1">{t("البريد الإلكتروني", "Email")}</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          placeholder="staff@restaurant.com" className={inputCls} dir="ltr" style={{ textAlign: "left" }} />
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--c2)] block mb-1">
          {t("كلمة المرور المؤقتة", "Temporary Password")}
          <span className="text-[var(--c3)] font-normal ms-1">
            ({t("8 أحرف على الأقل", "8+ characters")})
          </span>
        </label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          minLength={8} placeholder="••••••••" className={inputCls} />
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--rx)] text-xs text-[var(--c2)]"
        style={{ background: "var(--b3)", border: "1px solid var(--bd)" }}>
        <span>ℹ️</span>
        <p>{t("سيتم إنشاء الحساب فوراً. يمكن للموظف تسجيل الدخول بهذا البريد وكلمة المرور.",
             "Account created immediately. Staff can sign in with this email and password.")}</p>
      </div>

      <button type="submit" disabled={loading || success}
        className="w-full py-2.5 rounded-[var(--rs)] text-sm font-bold text-black disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, var(--ac), var(--ac2))" }}>
        {loading ? `⏳ ${t("جاري الإضافة…", "Adding…")}` : `✓ ${t("إضافة الموظف", "Add Staff Member")}`}
      </button>
    </form>
  );
}

// ── Staff Row ─────────────────────────────────────────────────
function StaffRow({ member, onRemoved, onRoleChanged, isOwner }: {
  member: StaffMember;
  onRemoved: () => void;
  onRoleChanged: () => void;
  isOwner: boolean;
}) {
  const { t } = useApp();
  const [removing,      setRemoving]      = useState(false);
  const [changingRole,  setChangingRole]  = useState(false);
  const [newRole,       setNewRole]       = useState<StaffRole>(member.role);
  const [showRoleEdit,  setShowRoleEdit]  = useState(false);

  const meta = ROLE_META[member.role];

  const handleRemove = async () => {
    if (!confirm(t(`حذف ${member.name}؟`, `Remove ${member.name}?`))) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      if (res.ok) onRemoved();
    } finally {
      setRemoving(false);
    }
  };

  const handleRoleChange = async () => {
    if (newRole === member.role) { setShowRoleEdit(false); return; }
    setChangingRole(true);
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: newRole }),
      });
      if (res.ok) { onRoleChanged(); setShowRoleEdit(false); }
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3.5 py-3 bg-[var(--b2)] rounded-[var(--rs)] border border-[var(--bd)]">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
        style={{ background: `${meta.color}20`, color: meta.color }}>
        {member.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{member.name}</div>
        <div className="text-xs text-[var(--c2)] font-[var(--fe)] truncate">{member.email}</div>
      </div>

      {/* Role badge / edit */}
      {showRoleEdit ? (
        <div className="flex items-center gap-1">
          <select value={newRole} onChange={e => setNewRole(e.target.value as StaffRole)}
            className="text-xs bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--rx)] px-2 py-1 outline-none focus:border-[var(--ac)]">
            {ASSIGNABLE_ROLES.map(r => (
              <option key={r} value={r}>{t(ROLE_META[r].labelAr, ROLE_META[r].labelEn)}</option>
            ))}
          </select>
          <button onClick={handleRoleChange} disabled={changingRole}
            className="px-2 py-1 rounded-[var(--rx)] text-xs font-bold bg-[var(--sc)] text-white">
            {changingRole ? "…" : "✓"}
          </button>
          <button onClick={() => setShowRoleEdit(false)}
            className="px-2 py-1 rounded-[var(--rx)] text-xs bg-[var(--b3)]">✕</button>
        </div>
      ) : (
        <button onClick={() => setShowRoleEdit(true)}
          className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold"
          style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
          {t(meta.labelAr, meta.labelEn)}
        </button>
      )}

      {/* Remove */}
      {isOwner && (
        <button onClick={handleRemove} disabled={removing}
          className="w-7 h-7 rounded-[var(--rx)] flex items-center justify-center text-xs transition-all
                     text-[var(--c3)] hover:bg-[var(--dgs)] hover:text-[var(--dg)]">
          {removing ? "…" : "🗑"}
        </button>
      )}
    </div>
  );
}

// ── Main StaffManager ─────────────────────────────────────────
export default function StaffManager({ userRole }: { userRole: StaffRole }) {
  const { t } = useApp();
  const [staff,   setStaff]   = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const isOwner   = userRole === "owner";
  const canWrite  = userRole === "owner" || userRole === "manager";

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) { setError("Failed to load staff"); return; }
      const json = await res.json();
      setStaff(json.data ?? []);
    } catch {
      setError(t("خطأ في تحميل البيانات", "Failed to load staff"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-extrabold mb-1">👥 {t("الفريق والصلاحيات", "Team & Permissions")}</div>
        <div className="text-sm text-[var(--c2)]">
          {t("إدارة أعضاء الفريق وصلاحياتهم", "Manage team members and roles")}
        </div>
      </div>

      {/* Add form — only for owner/manager */}
      {canWrite && <AddStaffForm onAdded={fetchStaff} />}

      {/* Staff list */}
      <div>
        <div className="text-sm font-bold mb-2 text-[var(--c2)]">
          {t("الأعضاء الحاليون", "Current Members")} ({staff.length})
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[60px] rounded-[var(--rs)] bg-[var(--b2)] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-[var(--dg)] px-3 py-2 rounded-[var(--rx)]"
            style={{ background: "var(--dgs)" }}>⚠️ {error}</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--c3)]">
            {t("لا يوجد موظفون بعد — أضف أول عضو", "No staff yet — add your first member")}
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map(member => (
              <StaffRow
                key={member.id}
                member={member}
                onRemoved={fetchStaff}
                onRoleChanged={fetchStaff}
                isOwner={isOwner}
              />
            ))}
          </div>
        )}
      </div>

      {/* RBAC table */}
      <div>
        <div className="text-sm font-bold mb-2 text-[var(--c2)]">
          {t("جدول الصلاحيات", "Permissions Matrix")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--bd)]">
                <th className="text-start py-2 px-3 text-[var(--c2)] font-semibold">{t("الدور", "Role")}</th>
                {["المنيو","الطلبات","AI Studio","Dashboard","العروض","الإعدادات"].map(h => (
                  <th key={h} className="py-2 px-2 text-[var(--c2)] font-semibold text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.entries(ROLE_META) as [StaffRole, typeof ROLE_META.owner][]).map(([role, meta]) => (
                <tr key={role} className="border-b border-[var(--bd)] hover:bg-[var(--b2)]">
                  <td className="py-2 px-3 font-semibold" style={{ color: meta.color }}>
                    {t(meta.labelAr, meta.labelEn)}
                  </td>
                  {[
                    role === "owner" || role === "manager" || role === "marketing" ? "✅ كامل" : "👁 قراءة",
                    role === "owner" || role === "manager" ? "✅" : role === "kitchen" ? "📺 KDS" : role === "waiter" ? "➕ فقط" : role === "cashier" ? "🔒 إغلاق" : "❌",
                    role === "owner" || role === "manager" || role === "marketing" ? "✅" : "❌",
                    role === "owner" || role === "manager" ? "✅" : role === "cashier" || role === "marketing" ? "👁" : "❌",
                    role === "owner" || role === "manager" || role === "marketing" ? "✅" : "❌",
                    role === "owner" ? "✅ + Billing" : role === "manager" ? "✅" : "❌",
                  ].map((val, i) => (
                    <td key={i} className="py-2 px-2 text-center">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
