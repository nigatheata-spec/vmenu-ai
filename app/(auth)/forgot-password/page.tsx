// app/(auth)/forgot-password/page.tsx
import { Suspense }           from "react";
import type { Metadata }      from "next";
import { AuthCard }           from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور — Vmenu.ai",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="استعادة كلمة المرور 🔑"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
      footerText="تذكرت كلمة المرور؟"
      footerLink={{ href: "/login", label: "تسجيل الدخول" }}
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
