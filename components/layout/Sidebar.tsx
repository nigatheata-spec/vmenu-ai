"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { useRole } from "@/hooks/useRole";
import type { NavRoute } from "@/lib/rbac";

interface NavItem {
  route: NavRoute;
  icon: string;
  labelAr: string;
  labelEn: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { route: "dashboard", icon: "📊", labelAr: "لوحة التحكم", labelEn: "Dashboard" },
  { route: "tables", icon: "📱", labelAr: "الطاولات + QR", labelEn: "Tables + QR" },
  { route: "menu", icon: "🎨", labelAr: "محرر المنيو", labelEn: "Menu Editor" },
  { route: "guest_menu", icon: "📱", labelAr: "منيو الزبون", labelEn: "Guest Menu" },
  { route: "photo", icon: "📸", labelAr: "استوديو الصور", labelEn: "Photo Studio" },
  { route: "video", icon: "🎬", labelAr: "استوديو الفيديو", labelEn: "Video Studio" },
  { route: "orders", icon: "📦", labelAr: "الطلبات", labelEn: "Orders" },
  { route: "promos", icon: "🤖", labelAr: "العروض الذكية", labelEn: "AI Promos" },
  { route: "settings", icon: "⚙️", labelAr: "الإعدادات", labelEn: "Settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({ open, onClose, onLogout }: SidebarProps) {
  const { state, dispatch, t } = useApp();
  const { allowedRoutes, role, isLoading } = useRole();

  const navigate = (route: string) => {
    dispatch({ type: "SET_ROUTE", payload: route });
    onClose();
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel — right side in RTL (Arabic), left side in LTR (English) */}
      <aside
        className={cn(
          "fixed top-0 z-50 h-screen w-[220px]",
          "bg-[var(--b1)] flex flex-col transition-transform duration-300",
          // RTL: anchored to right, slides right when hidden
          "rtl:right-0 rtl:border-l rtl:border-[var(--bd)]",
          "rtl:translate-x-full rtl:lg:translate-x-0",
          // LTR: anchored to left, slides left when hidden
          "ltr:left-0 ltr:border-r ltr:border-[var(--bd)]",
          "ltr:-translate-x-full ltr:lg:translate-x-0",
          open && "rtl:translate-x-0 ltr:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3.5 py-3 border-b border-[var(--bd)]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--ac)] to-[var(--ac2)] flex items-center justify-center text-black font-black text-xs font-[var(--fe)]">
            V
          </div>
          <span className="font-black text-base font-[var(--fd)]">
            Vmenu<span className="text-[var(--ac)]">.ai</span>
          </span>
        </div>

        {/* Nav items — filtered by role via useRole() */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {ALL_NAV_ITEMS
            .filter(item =>
              isLoading || !role
                ? true  // show all while loading to avoid flicker
                : allowedRoutes.includes(item.route)
            )
            .map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={cn(
                "w-full flex items-center gap-2 px-3.5 py-2 text-[0.83rem] transition-all duration-200",
                "border-e-[3px] text-[var(--c2)] hover:text-[var(--c0)] hover:bg-[var(--acs)]",
                state.route === item.route
                  ? "text-[var(--ac)] bg-[var(--acs)] border-e-[var(--ac)] font-bold"
                  : "border-e-transparent"
              )}
            >
              <span className="w-[18px] text-center text-[0.93rem]">{item.icon}</span>
              <span>{t(item.labelAr, item.labelEn)}</span>
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3.5 py-2 border-t border-[var(--bd)]">
          {state.auth && (
            <div
              className="flex items-center gap-2 p-1.5 rounded-[var(--rx)] bg-[var(--b2)] mb-1.5 cursor-pointer hover:bg-[var(--acs)]"
            >
              <div className="w-[26px] h-[26px] rounded-[6px] bg-[var(--ac)] text-black flex items-center justify-center font-black text-xs flex-shrink-0">
                {state.auth.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.75rem] font-bold truncate">{state.auth.resto}</div>
                <div className="text-[0.6rem] text-[var(--c2)] truncate font-[var(--fe)]">
                  {state.auth.email}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" })}
              className="flex-1 h-7 rounded-[6px] bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center text-[0.76rem] hover:bg-[var(--acs)] hover:border-[var(--ac)] transition-all duration-200"
              title={t("تغيير الثيم", "Toggle theme")}
            >
              {state.theme === "dark" ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => dispatch({ type: "SET_LANG", payload: state.lang === "ar" ? "en" : "ar" })}
              className="flex-1 h-7 rounded-[6px] bg-[var(--b2)] border border-[var(--bd)] text-[0.68rem] font-bold font-[var(--fe)] hover:bg-[var(--acs)] hover:border-[var(--ac)] transition-all duration-200"
              title={t("تغيير اللغة", "Toggle language")}
            >
              {state.lang === "ar" ? "EN" : "عربي"}
            </button>
            <button
              onClick={onLogout}
              className="flex-1 h-7 rounded-[6px] bg-[var(--b2)] border border-[var(--bd)] text-[0.72rem] hover:bg-[var(--dgs)] hover:border-[var(--dg)] hover:text-[var(--dg)] transition-all duration-200"
              title={t("خروج", "Logout")}
            >
              ↩
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
