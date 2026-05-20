"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { useRole } from "@/hooks/useRole";
import type { NavRoute } from "@/lib/rbac";
import {
  ChartBar, QrCode, ForkKnife, Storefront, Camera,
  VideoCamera, Package, Sparkle, Gear,
  Sun, Moon, Globe, SignOut,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

interface NavItem {
  route:   NavRoute;
  icon:    PhosphorIcon;
  labelAr: string;
  labelEn: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { route: "dashboard",  icon: ChartBar,    labelAr: "لوحة التحكم",     labelEn: "Dashboard"    },
  { route: "tables",     icon: QrCode,      labelAr: "الطاولات + QR",   labelEn: "Tables + QR"  },
  { route: "menu",       icon: ForkKnife,   labelAr: "محرر المنيو",     labelEn: "Menu Editor"  },
  { route: "guest_menu", icon: Storefront,  labelAr: "منيو الزبون",     labelEn: "Guest Menu"   },
  { route: "photo",      icon: Camera,      labelAr: "استوديو الصور",   labelEn: "Photo Studio" },
  { route: "video",      icon: VideoCamera, labelAr: "استوديو الفيديو", labelEn: "Video Studio" },
  { route: "orders",     icon: Package,     labelAr: "الطلبات",         labelEn: "Orders"       },
  { route: "promos",     icon: Sparkle,     labelAr: "العروض الذكية",   labelEn: "AI Promos"    },
  { route: "settings",   icon: Gear,        labelAr: "الإعدادات",       labelEn: "Settings"     },
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
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--bd)]">
          <div className="w-7 h-7 rounded-lg bg-[var(--ac)] flex items-center justify-center shrink-0">
            <span className="text-black font-black text-xs font-[var(--fe)]">V</span>
          </div>
          <span className="font-black text-[0.95rem] font-[var(--fd)] tracking-tight">
            Vmenu<span className="text-[var(--ac)]">.ai</span>
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
          {ALL_NAV_ITEMS
            .filter(item =>
              isLoading || !role ? true : allowedRoutes.includes(item.route)
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = state.route === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[0.82rem] transition-all duration-200",
                    "border-e-[2px]",
                    isActive
                      ? "text-[var(--ac)] bg-[var(--acs)] border-e-[var(--ac)] font-semibold"
                      : "text-[var(--c2)] hover:text-[var(--c0)] hover:bg-[var(--b2)] border-e-transparent"
                  )}
                >
                  <Icon size={14} weight={isActive ? "fill" : "regular"} />
                  <span>{t(item.labelAr, item.labelEn)}</span>
                </button>
              );
            })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-2.5 border-t border-[var(--bd)]">
          {state.auth && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--rx)] bg-[var(--b2)] mb-2">
              <div className="w-[26px] h-[26px] rounded-[6px] bg-[var(--ac)] text-black flex items-center justify-center font-black text-xs flex-shrink-0">
                {state.auth.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.74rem] font-bold truncate">{state.auth.resto}</div>
                <div className="text-[0.6rem] text-[var(--c2)] truncate font-[var(--fe)]">
                  {state.auth.email}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" })}
              className="flex-1 h-7 rounded-[6px] bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center text-[var(--c2)] hover:bg-[var(--acs)] hover:border-[var(--ac)] hover:text-[var(--ac)] transition-all"
              title={t("تغيير الثيم", "Toggle theme")}
            >
              {state.theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
            </button>
            <button
              onClick={() => dispatch({ type: "SET_LANG", payload: state.lang === "ar" ? "en" : "ar" })}
              className="flex-1 h-7 rounded-[6px] bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center gap-1 text-[var(--c2)] hover:bg-[var(--acs)] hover:border-[var(--ac)] hover:text-[var(--ac)] transition-all"
              title={t("تغيير اللغة", "Toggle language")}
            >
              <Globe size={12} />
              <span className="text-[0.6rem] font-bold font-[var(--fe)]">
                {state.lang === "ar" ? "EN" : "ع"}
              </span>
            </button>
            <button
              onClick={onLogout}
              className="flex-1 h-7 rounded-[6px] bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center text-[var(--c2)] hover:bg-[var(--dgs)] hover:border-[var(--dg)] hover:text-[var(--dg)] transition-all"
              title={t("خروج", "Logout")}
            >
              <SignOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
