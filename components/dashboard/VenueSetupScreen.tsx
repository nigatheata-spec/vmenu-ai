"use client";

// =============================================================
// components/dashboard/VenueSetupScreen.tsx
//
// Shown when the authenticated user has no venue yet.
// Calls POST /api/setup-account to create the venue and assign
// the owner role, then reloads the dashboard.
// =============================================================

import React, { useState, useEffect } from "react";
import { useRouter }        from "next/navigation";
import { supabase }         from "@/lib/supabase/client";
import { setupAccount }     from "@/lib/api/setupAccount";
import { slugify }          from "@/lib/utils";
import type { AuthSession } from "@/types/supabase";

interface VenueSetupScreenProps {
  session: AuthSession;
}

export default function VenueSetupScreen({ session }: VenueSetupScreenProps) {
  const router = useRouter();
  const [venueName, setVenueName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [retrying,  setRetrying]  = useState(true);

  // ── Auto-poll: venue may still be in-flight from /auth/callback ──
  useEffect(() => {
    let attempts = 0;
    const MAX = 5;

    const check = async () => {
      attempts++;
      const { data } = await supabase
        .from("venues")
        .select("id")
        .eq("owner_id", session.userId)
        .maybeSingle();

      if (data?.id) {
        router.refresh(); // venue now exists — reload server session
        return;
      }

      if (attempts < MAX) {
        setTimeout(check, 2000);
      } else {
        setRetrying(false); // polling gave up — show manual form
      }
    };

    setTimeout(check, 1500);
  }, [session.userId, router]);

  // ── Manual create via /api/setup-account ──────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim()) return;

    setError(null);
    setIsLoading(true);

    const result = await setupAccount({
      user_id:    session.userId,
      venue_name: venueName.trim(),
    });

    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.error);
      return;
    }

    // Success — refresh the page so the server re-runs getServerSession()
    // and finds the newly created venue.
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--b0)] flex items-center justify-center p-5">
      <div
        className="w-full max-w-[420px] bg-[var(--b1)] border border-[var(--bd)]
                   rounded-[var(--r)] shadow-[0_8px_40px_rgba(0,0,0,.3)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center
                         font-black text-black text-sm font-[var(--fe)]"
              style={{ background: "linear-gradient(135deg, var(--ac), var(--ac2))" }}
            >
              V
            </div>
            <span className="font-black text-[1.1rem] font-[var(--fd)]">
              Vmenu<span className="text-[var(--ac)]">.ai</span>
            </span>
          </div>
          <h1 className="text-xl font-extrabold mb-1">
            {retrying ? "⏳ جاري إعداد حسابك…" : "🏪 أنشئ مطعمك"}
          </h1>
          <p className="text-sm text-[var(--c2)]">
            {retrying
              ? "تم تفعيل بريدك بنجاح! جاري إعداد بيانات مطعمك…"
              : "أدخل اسم مطعمك للمتابعة"}
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {retrying ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <span className="w-10 h-10 rounded-full border-2 border-[var(--bd2)] border-t-[var(--ac)] animate-spin" />
              <p className="text-xs text-[var(--c2)] text-center">
                يتم إعداد البيانات تلقائياً، يرجى الانتظار…
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {error && (
                <div className="px-3.5 py-2.5 rounded-[var(--rs)] text-sm text-[var(--dg)]"
                  style={{ background: "var(--dgs)", border: "1px solid var(--dg)" }}>
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label htmlFor="venueName"
                  className="text-[0.8rem] font-semibold text-[var(--c1)] block mb-1">
                  اسم المطعم أو المقهى <span className="text-[var(--dg)]">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute start-3 text-sm pointer-events-none">🏪</span>
                  <input
                    id="venueName"
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="مطعم البيت"
                    required
                    className="w-full ps-9 py-2.5 rounded-[var(--rs)] text-sm
                               bg-[var(--b2)] border border-[var(--bd2)]
                               text-[var(--c0)] outline-none
                               focus:border-[var(--ac)] transition-colors"
                  />
                </div>
                {venueName.trim() && (
                  <p className="text-[0.7rem] text-[var(--c3)] font-[var(--fe)] mt-1">
                    رابط المنيو: vmenu.ai/
                    <span className="text-[var(--ac)]">{slugify(venueName)}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !venueName.trim()}
                className="w-full py-3 rounded-[var(--rf)] text-sm font-bold text-black
                           transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, var(--ac), var(--ac2))",
                  boxShadow: "0 4px 16px rgba(255,180,50,.25)",
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    جاري الإنشاء…
                  </span>
                ) : (
                  "إنشاء المطعم والبدء →"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 pb-5 text-center">
          <p className="text-xs text-[var(--c3)]">
            مرحباً{" "}
            <span className="text-[var(--ac)] font-semibold">{session.name}</span>
            {" "}— {session.email}
          </p>
        </div>
      </div>
    </div>
  );
}
