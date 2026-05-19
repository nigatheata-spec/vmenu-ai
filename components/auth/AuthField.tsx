"use client";

// =============================================================
// components/auth/AuthField.tsx
//
// Reusable form field for all auth pages.
// Handles: label, input, error message, password toggle, RTL.
// =============================================================

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface AuthFieldProps {
  id:          string;
  label:       string;
  type?:       "text" | "email" | "password" | "tel";
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  error?:       string;
  autoComplete?: string;
  required?:    boolean;
  disabled?:    boolean;
  /** Icon shown on the left (RTL: right) side of the input */
  icon?:        React.ReactNode;
  dir?:         "ltr" | "rtl" | "auto";
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  required,
  disabled,
  icon,
  dir,
}: AuthFieldProps) {
  const [showPwd, setShowPwd] = useState(false);
  const inputType = type === "password" ? (showPwd ? "text" : "password") : type;
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1">
      {/* Label */}
      <label
        htmlFor={id}
        className="text-[0.8rem] font-semibold text-[var(--c1)] select-none"
      >
        {label}
        {required && <span className="text-[var(--dg)] ms-0.5">*</span>}
      </label>

      {/* Input wrapper */}
      <div className="relative flex items-center">
        {/* Leading icon */}
        {icon && (
          <span
            className="absolute start-3 text-[var(--c2)] text-[0.9rem] pointer-events-none select-none z-10"
            aria-hidden
          >
            {icon}
          </span>
        )}

        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          dir={dir}
          className={cn(
            "w-full rounded-[var(--rs)] px-3 py-2.5 text-sm outline-none",
            "bg-[var(--b2)] text-[var(--c0)]",
            "border transition-all duration-200",
            "placeholder:text-[var(--c3)]",
            "focus:ring-2 focus:ring-[var(--ac)] focus:ring-opacity-20",
            icon && "ps-9",
            type === "password" && "pe-10",
            hasError
              ? "border-[var(--dg)] bg-[var(--dgs)] focus:border-[var(--dg)]"
              : "border-[var(--bd2)] focus:border-[var(--ac)]",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />

        {/* Password toggle */}
        {type === "password" && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd((v) => !v)}
            className="absolute end-3 text-[var(--c2)] hover:text-[var(--c0)] transition-colors text-sm select-none"
            aria-label={showPwd ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPwd ? "🙈" : "👁"}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[0.72rem] text-[var(--dg)] flex items-center gap-1 animate-fadeUp">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
