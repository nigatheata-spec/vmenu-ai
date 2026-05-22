import type { Metadata } from "next";
import { AppProvider } from "@/lib/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vmenu.ai — قائمة طعام ذكية",
  description: "QR menu, AI photos, smart promos — everything your restaurant needs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=El+Messiri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/*
          AppProvider wraps everything so both auth pages and the
          dashboard can access lang/theme state.
          Auth pages don't use any other context state.
        */}
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
