"use client";

// =============================================================
// components/auth/AuthSubmitButton.tsx
//
// Submit button with three states: idle | loading | success.
// Used by both LoginForm and SignupForm.
// =============================================================

import React from "react";
import { cn } from "@/lib/utils";

interface AuthSubmitButtonProps {
  label:       string;
  loadingLabel?: string;
  isLoading:   boolean;
  disabled?:   boolean;
  fullWidth?:  boolean;
}

export function AuthSubmitButton({
  label,
  loadingLabel = "جاري التحميل…",
  isLoading,
  disabled,
  fullWidth = true,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={cn(
        "flex items-center justify-center gap-2",
        "font-bold text-sm text-black rounded-[var(--rf)]",
        "py-3 px-6 transition-all duration-200 select-none",
        "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        fullWidth && "w-full",
      )}
      style={{
        background: isLoading
          ? "var(--b3)"
          : "linear-gradient(135deg, var(--ac), var(--ac2))",
        color: isLoading ? "var(--c2)" : "#000",
        boxShadow: isLoading ? "none" : "0 4px 16px rgba(255,180,50,.25)",
      }}
    >
      {isLoading ? (
        <>
          {/* Spinner */}
          <span
            className="w-4 h-4 rounded-full border-2 border-[var(--c3)] border-t-[var(--ac)] animate-spin"
            aria-hidden
          />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
