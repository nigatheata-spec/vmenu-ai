// app/(auth)/reset-password/page.tsx
import type { Metadata } from "next";
import { AuthCard }         from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة — Vmenu.ai",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="كلمة مرور جديدة 🔐"
      subtitle="اختر كلمة مرور قوية لحسابك"
      footerText="تذكرت كلمة المرور؟"
      footerLink={{ href: "/login", label: "تسجيل الدخول" }}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
