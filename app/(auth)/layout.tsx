// =============================================================
// app/(auth)/layout.tsx
//
// Minimal layout for unauthenticated pages (/login, /signup).
// Does NOT wrap with AppProvider — auth pages have no app state.
// Uses the same globals.css so all CSS vars are available.
// =============================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vmenu.ai — تسجيل الدخول",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Render inside the existing <html> from the root layout.
    // We only need a fragment here.
    <>{children}</>
  );
}
