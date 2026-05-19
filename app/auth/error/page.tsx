"use client";

// =============================================================
// app/auth/error/page.tsx
//
// Supabase sends errors like expired links as URL hash fragments:
//   /auth/callback#error=access_denied&error_code=otp_expired&...
//
// Hash fragments are NEVER sent to the server — they live only
// in the browser. This client page reads window.location.hash
// and redirects to the correct page with a human-readable message.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function parseHash(hash: string): Record<string, string> {
  const result: Record<string, string> = {};
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  clean.split("&").forEach((pair) => {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  });
  return result;
}

export default function AuthErrorPage() {
  const router = useRouter();
  const [message, setMessage] = useState("جاري التحقق…");

  useEffect(() => {
    const params = parseHash(window.location.hash);
    const errorCode = params.error_code ?? params.error ?? "";
    const errorDesc = params.error_description ?? "";

    console.error("[auth/error] Hash error params:", params);

    // Expired or already-used link
    if (
      errorCode === "otp_expired" ||
      errorCode === "otp_already_used" ||
      errorDesc.toLowerCase().includes("expired") ||
      errorDesc.toLowerCase().includes("invalid")
    ) {
      setMessage("انتهت صلاحية الرابط، يتم تحويلك…");
      setTimeout(() => {
        router.replace("/forgot-password?error=link_expired");
      }, 1500);
      return;
    }

    // Access denied
    if (errorCode === "access_denied" || params.error === "access_denied") {
      setMessage("تم رفض الوصول، يتم تحويلك…");
      setTimeout(() => {
        router.replace("/login?error=access_denied");
      }, 1500);
      return;
    }

    // Generic fallback
    setMessage("حدث خطأ، يتم تحويلك…");
    setTimeout(() => {
      router.replace("/login?error=unknown");
    }, 1500);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--b0)]">
      <span className="w-8 h-8 rounded-full border-2 border-[var(--bd2)] border-t-[var(--dg)] animate-spin" />
      <p className="text-sm text-[var(--c2)]">{message}</p>
    </div>
  );
}
