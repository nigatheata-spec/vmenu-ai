"use client";

// =============================================================
// components/auth/AuthCard.tsx
//
// The visual card container shared by /login and /signup.
// Provides: logo, title, subtitle, children slot, footer link.
// Split from form logic so each page only owns its own state.
// =============================================================

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title:        string;
  subtitle:     string;
  footerText:   string;
  footerLink:   { href: string; label: string };
  children:     React.ReactNode;
  maxWidth?:    string;
}

export function AuthCard({
  title,
  subtitle,
  footerText,
  footerLink,
  children,
  maxWidth = "420px",
}: AuthCardProps) {
  return (
    /* Full-page centered layout */
    <div className="min-h-screen bg-[var(--b0)] flex items-center justify-center p-5">

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{
            background: "radial-gradient(circle, var(--ac) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Card */}
      <div
        className={cn(
          "relative w-full animate-scaleIn",
          "bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)]",
          "shadow-[0_8px_40px_rgba(0,0,0,.35)]",
        )}
        style={{ maxWidth }}
      >
        {/* ── Header ── */}
        <div className="px-7 pt-7 pb-5 border-b border-[var(--bd)]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center
                         font-black text-black text-sm font-[var(--fe)] flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--ac), var(--ac2))",
              }}
            >
              V
            </div>
            <span className="font-black text-[1.1rem] font-[var(--fd)] tracking-tight">
              Vmenu<span className="text-[var(--ac)]">.ai</span>
            </span>
          </div>

          {/* Title + subtitle */}
          <h1 className="text-xl font-extrabold text-[var(--c0)] mb-1">
            {title}
          </h1>
          <p className="text-sm text-[var(--c2)]">{subtitle}</p>
        </div>

        {/* ── Body (form) ── */}
        <div className="px-7 py-6">{children}</div>

        {/* ── Footer link ── */}
        <div className="px-7 pb-6 text-center">
          <p className="text-sm text-[var(--c2)]">
            {footerText}{" "}
            <Link
              href={footerLink.href}
              className="text-[var(--ac)] font-semibold hover:underline underline-offset-2"
            >
              {footerLink.label}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
