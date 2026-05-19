"use client";

import React from "react";
import { useApp } from "@/lib/context";

interface TopBarProps {
  onMenuToggle: () => void;
  extra?: React.ReactNode;
}

const ROUTE_META: Record<string, { icon: string; labelAr: string; labelEn: string; badge: string }> = {
  dashboard: { icon: "📊", labelAr: "لوحة التحكم", labelEn: "Dashboard", badge: "Live" },
  tables:    { icon: "📱", labelAr: "الطاولات + QR", labelEn: "Tables + QR", badge: "QR" },
  menu:      { icon: "🎨", labelAr: "محرر المنيو", labelEn: "Menu Editor", badge: "Editor" },
  photo:     { icon: "📸", labelAr: "استوديو الصور", labelEn: "Photo Studio", badge: "Gemini" },
  video:     { icon: "🎬", labelAr: "استوديو الفيديو", labelEn: "Video Studio", badge: "Multi-AI" },
  orders:    { icon: "📦", labelAr: "الطلبات", labelEn: "Orders", badge: "All" },
  promos:    { icon: "🤖", labelAr: "العروض الذكية", labelEn: "AI Promos", badge: "Claude" },
  settings:  { icon: "⚙️", labelAr: "الإعدادات", labelEn: "Settings", badge: "Admin" },
};

export default function TopBar({ onMenuToggle, extra }: TopBarProps) {
  const { state, t } = useApp();
  const meta = ROUTE_META[state.route] ?? ROUTE_META.dashboard;

  return (
    <header className="h-[50px] border-b border-[var(--bd)] flex items-center justify-between px-5
                       bg-[var(--bg)] backdrop-blur-lg sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-8 h-8 rounded-lg bg-[var(--b2)] border border-[var(--bd)]
                     flex items-center justify-center text-sm transition-all hover:border-[var(--ac)]"
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <span className="text-base font-extrabold flex items-center gap-2">
          <span>{meta.icon}</span>
          <span>{t(meta.labelAr, meta.labelEn)}</span>
          <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-bold font-[var(--fe)]
                           bg-[var(--acs)] text-[var(--ac)] border border-[var(--bda)]">
            {meta.badge}
          </span>
        </span>
      </div>

      {/* Route-specific action slot */}
      {extra && <div className="flex items-center gap-2">{extra}</div>}
    </header>
  );
}
