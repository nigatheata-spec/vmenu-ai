"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ── Badge ─────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: "accent" | "success" | "danger" | "warning" | "info" | "muted";
  className?: string;
}
export function Badge({ children, variant = "accent", className }: BadgeProps) {
  const map: Record<string, string> = {
    accent: "bg-[var(--acs)] text-[var(--ac)] border border-[var(--bda)]",
    success: "bg-[var(--scs)] text-[var(--sc)] border border-[var(--sc)]",
    danger: "bg-[var(--dgs)] text-[var(--dg)] border border-[var(--dg)]",
    warning: "bg-[var(--wrs)] text-[var(--wr)] border border-[var(--wr)]",
    info: "bg-[var(--ins)] text-[var(--in)] border border-[var(--in)]",
    muted: "bg-[var(--b3)] text-[var(--c2)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold font-[var(--fe)]",
        map[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const varMap: Record<string, string> = {
    primary:
      "bg-gradient-to-br from-[var(--ac)] to-[var(--ac2)] text-black font-bold hover:opacity-90 active:scale-95",
    secondary:
      "border border-[var(--bd2)] text-[var(--c1)] hover:border-[var(--ac)] hover:text-[var(--ac)] bg-transparent",
    ghost:
      "bg-[var(--b2)] border border-[var(--bd)] text-[var(--c1)] hover:bg-[var(--acs)] hover:border-[var(--ac)]",
    danger:
      "bg-[var(--dgs)] border border-[var(--dg)] text-[var(--dg)] hover:opacity-80",
  };
  const sizeMap: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-[var(--rs)]",
    md: "px-4 py-2 text-sm rounded-[var(--rs)]",
    lg: "px-6 py-3 text-base rounded-[var(--rf)]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer select-none",
        varMap[variant],
        sizeMap[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}
export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[var(--b1)] border border-[var(--bd)] rounded-[var(--r)] overflow-hidden",
        hover &&
          "transition-all duration-200 hover:border-[var(--bda)] hover:-translate-y-0.5 hover:shadow-[var(--sh)] cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-[var(--bd)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

// ── Toggle ────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}
export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0",
        checked ? "bg-[var(--sc)]" : "bg-[var(--b3)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
          // RTL-aware: CSS handles the side via dir attribute
          "rtl:right-0.5 ltr:left-0.5",
          checked ? "rtl:-translate-x-[18px] ltr:translate-x-[18px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)]",
        "px-3 py-2 text-sm text-[var(--c0)] outline-none",
        "focus:border-[var(--ac)] transition-colors duration-200",
        "placeholder:text-[var(--c3)]",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full bg-[var(--b2)] border border-[var(--bd2)] rounded-[var(--rx)]",
        "px-3 py-2 text-sm text-[var(--c0)] outline-none resize-none",
        "focus:border-[var(--ac)] transition-colors duration-200",
        "placeholder:text-[var(--c3)]",
        className
      )}
      {...props}
    />
  );
}

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}
export function Modal({ open, onClose, title, children, footer, maxWidth = "440px" }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] bg-[var(--ov)] flex items-center justify-center p-5 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full bg-[var(--b1)] border border-[var(--bd2)] rounded-[var(--r)] flex flex-col max-h-[90vh] animate-scaleIn overflow-hidden"
        style={{ maxWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd)]">
          <span className="font-extrabold text-base flex items-center gap-2">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--b2)] border border-[var(--bd)] flex items-center justify-center text-sm
                       hover:bg-[var(--dg)] hover:text-white hover:border-[var(--dg)] transition-all duration-150"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex gap-2 px-5 py-3 border-t border-[var(--bd)]">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ── Toast container (imperative) ──────────────────────────────
// Use via useToast hook
export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed top-[65px] end-5 z-[1000] flex flex-col gap-1.5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "px-3 py-2 rounded-[var(--rs)] border flex items-center gap-1.5 text-sm font-semibold max-w-[300px]",
            "shadow-[var(--sh)] bg-[var(--b1)] animate-toastIn pointer-events-auto",
            t.type === "s" && "border-[var(--sc)] bg-[var(--scs)] text-[var(--sc)]",
            t.type === "e" && "border-[var(--dg)] bg-[var(--dgs)] text-[var(--dg)]",
            t.type === "i" && "border-[var(--in)] bg-[var(--ins)] text-[var(--in)]"
          )}
        >
          <span>{t.type === "s" ? "✓" : t.type === "e" ? "⚠" : "ℹ"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export interface ToastItem {
  id: string;
  message: string;
  type: "s" | "e" | "i";
}
