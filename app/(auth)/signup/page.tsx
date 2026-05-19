// =============================================================
// app/(auth)/signup/page.tsx
//
// Route: /signup
// - Server Component — metadata set here
// - Delegates all interactivity to <SignupForm />
// =============================================================

import type { Metadata } from "next";
import { AuthCard }   from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "إنشاء حساب — Vmenu.ai",
  description: "أنشئ حساباً مجانياً وابدأ في بناء منيوك الرقمي",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="إنشاء حساب مجاني ✨"
      subtitle="ابدأ في بناء منيوك الرقمي — لا يلزم بطاقة ائتمانية"
      footerText="لديك حساب بالفعل؟"
      footerLink={{ href: "/login", label: "سجّل الدخول" }}
      maxWidth="460px"
    >
      <SignupForm />
    </AuthCard>
  );
}
