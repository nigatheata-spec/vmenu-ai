// =============================================================
// app/(auth)/login/page.tsx
//
// Route: /login
// - Server Component (no "use client") — metadata is set here
// - Delegates all interactivity to <LoginForm /> (Client Component)
// - AuthCard handles the visual layout
// =============================================================

import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول — Vmenu.ai",
  description: "سجّل الدخول لإدارة منيو مطعمك",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="أهلاً بك مجدداً 👋"
      subtitle="سجّل الدخول لإدارة مطعمك ومنيوك الرقمي"
      footerText="ليس لديك حساب؟"
      footerLink={{ href: "/signup", label: "أنشئ حساباً مجاناً" }}
    >
      {/*
        Wrapping LoginForm in Suspense because it uses useSearchParams()
        which requires it in Next.js 15 App Router.
      */}
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
