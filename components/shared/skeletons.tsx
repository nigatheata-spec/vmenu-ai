"use client";

// =============================================================
// Vmenu.ai — Skeleton loaders
// Pulse-animated placeholders that match the real item layouts
// so there is no layout shift when data arrives.
// =============================================================

import React from "react";
import { cn } from "@/lib/utils";

// -------------------------------------------------------------
// Primitive
// -------------------------------------------------------------
function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("rounded bg-[var(--b3)] animate-pulse", className)}
      style={style}
    />
  );
}

// -------------------------------------------------------------
// Single item row skeleton (matches compact / standard layouts)
// -------------------------------------------------------------
export function ItemRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
      {/* Emoji / thumbnail placeholder */}
      <Bone className="w-10 h-10 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Bone className="h-3 w-2/3" />
        <Bone className="h-2.5 w-1/3" />
      </div>
      {/* Toggle placeholder */}
      <Bone className="w-9 h-5 rounded-full flex-shrink-0" />
      {/* Edit button placeholder */}
      <Bone className="w-6 h-6 rounded flex-shrink-0" />
    </div>
  );
}

// -------------------------------------------------------------
// Category row skeleton
// -------------------------------------------------------------
export function CategoryRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--rs)] bg-[var(--b2)] border border-[var(--bd)]">
      <Bone className="w-4 h-4 rounded flex-shrink-0" />
      <Bone className="w-6 h-6 rounded flex-shrink-0" />
      <Bone className="h-3 flex-1" />
      <Bone className="w-6 h-3 flex-shrink-0" />
      <Bone className="w-9 h-5 rounded-full flex-shrink-0" />
    </div>
  );
}

// -------------------------------------------------------------
// Preview phone skeleton (checkerboard background)
// -------------------------------------------------------------
export function MenuPreviewSkeleton({ width }: { width: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-[22px] overflow-hidden"
      style={{ width, background: "var(--b1)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--bd)] flex flex-col items-center gap-2">
        <Bone className="h-5 w-36" />
        <Bone className="h-3 w-24" />
      </div>
      {/* Category pills */}
      <div className="flex gap-1.5 px-3.5 py-2.5 border-b border-[var(--bd)]">
        {[80, 64, 96, 72].map((w, i) => (
          <Bone key={i} className={`h-7 rounded-full flex-shrink-0`} style={{ width: w }} />
        ))}
      </div>
      {/* Item rows */}
      <div className="p-3 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: "90px 1fr" }}>
            <Bone className="w-[90px] h-[90px]" />
            <div className="p-2.5 space-y-2">
              <Bone className="h-3 w-3/4" />
              <Bone className="h-2.5 w-full" />
              <Bone className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Full-panel skeleton: n rows
// -------------------------------------------------------------
export function ItemListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <ItemRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <CategoryRowSkeleton key={i} />
      ))}
    </div>
  );
}
