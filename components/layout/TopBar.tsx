"use client";

import React from "react";
import { useApp } from "@/lib/context";
import {
  ChartBar, QrCode, ForkKnife, Camera, VideoCamera,
  Package, Sparkle, Gear, List,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

interface TopBarProps {
  onMenuToggle: () => void;
  extra?: React.ReactNode;
}

const ROUTE_META: Record<string, { icon: PhosphorIcon; labelAr: string; labelEn: string; badge: string }> = {
  dashboard: { icon: ChartBar,    labelAr: "لوحة التحكم",     labelEn: "Dashboard",   badge: "Live"     },
  tables:    { icon: QrCode,      labelAr: "الطاولات + QR",   labelEn: "Tables + QR", badge: "QR"       },
  menu:      { icon: ForkKnife,   labelAr: "محرر المنيو",     labelEn: "Menu Editor", badge: "Editor"   },
  guest_menu:{ icon: ForkKnife,   labelAr: "منيو الزبون",     labelEn: "Guest Menu",  badge: "View"     },
  photo:     { icon: Camera,      labelAr: "استوديو الصور",   labelEn: "Photo Studio",badge: "Gemini"   },
  video:     { icon: VideoCamera, labelAr: "استوديو الفيديو", labelEn: "Video Studio",badge: "Multi-AI" },
  orders:    { icon: Package,     labelAr: "الطلبات",         labelEn: "Orders",      badge: "All"      },
  promos:    { icon: Sparkle,     labelAr: "العروض الذكية",   labelEn: "AI Promos",   badge: "Claude"   },
  settings:  { icon: Gear,        labelAr: "الإعدادات",       labelEn: "Settings",    badge: "Admin"    },
};

export default function TopBar({ onMenuToggle, extra }: TopBarProps) {
  const { state, t } = useApp();
  const meta = ROUTE_META[state.route] ?? ROUTE_META.dashboard;
  const Icon = meta.icon;

  return (
    <header className="h-[50px] border-b border-[var(--bd)] flex items-center justify-between px-4
                       bg-[var(--bg)] backdrop-blur-lg sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-8 h-8 rounded-lg bg-[var(--b2)] border border-[var(--bd)]
                     flex items-center justify-center text-[var(--c2)] transition-all hover:border-[var(--ac)] hover:text-[var(--ac)]"
          aria-label="Toggle menu"
        >
          <List size={16} weight="regular" />
        </button>

        <div className="flex items-center gap-2 font-bold text-[0.9rem]">
          <Icon size={15} weight="fill" color="var(--ac)" />
          <span>{t(meta.labelAr, meta.labelEn)}</span>
          <span className="text-[0.58rem] px-2 py-0.5 rounded-full font-bold font-[var(--fe)]
                           bg-[var(--acs)] text-[var(--ac)] border border-[var(--bda)]">
            {meta.badge}
          </span>
        </div>
      </div>

      {/* Route-specific action slot */}
      {extra && <div className="flex items-center gap-2">{extra}</div>}
    </header>
  );
}
