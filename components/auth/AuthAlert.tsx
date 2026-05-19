"use client";

// =============================================================
// components/auth/AuthAlert.tsx
//
// Inline alert banner for auth error and success messages.
// =============================================================

import React from "react";
import { cn } from "@/lib/utils";

interface AuthAlertProps {
  message: string;
  type:    "error" | "success" | "info";
}

const CONFIG = {
  error:   { icon: "⚠️", bg: "var(--dgs)", border: "var(--dg)", text: "var(--dg)" },
  success: { icon: "✓",  bg: "var(--scs)", border: "var(--sc)", text: "var(--sc)" },
  info:    { icon: "ℹ",  bg: "var(--ins)", border: "var(--in)", text: "var(--in)" },
};

export function AuthAlert({ message, type }: AuthAlertProps) {
  const c = CONFIG[type];
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-3.5 py-2.5 rounded-[var(--rs)] text-sm font-medium animate-fadeUp"
      style={{
        background:   c.bg,
        border:       `1px solid ${c.border}`,
        color:        c.text,
      }}
    >
      <span className="flex-shrink-0 mt-0.5" aria-hidden>{c.icon}</span>
      <span className="leading-snug">{message}</span>
    </div>
  );
}
