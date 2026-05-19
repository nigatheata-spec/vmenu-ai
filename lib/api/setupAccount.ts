// =============================================================
// lib/api/setupAccount.ts
//
// Typed client-side wrapper for POST /api/setup-account.
// Call this from any "use client" component after the user
// completes signup and a session is available.
//
// Usage — see VenueSetupScreen.tsx for a full working example.
// =============================================================

// ── Types ─────────────────────────────────────────────────────

export interface SetupAccountInput {
  /** The Supabase Auth user id (from session.user.id) */
  user_id:    string;
  /** Human-readable venue name entered by the user */
  venue_name: string;
}

export interface SetupAccountSuccess {
  venue_id:   string;
  venue_name: string;
  venue_slug: string;
  role:       "owner";
  /** false when the venue already existed (idempotent call) */
  created:    boolean;
}

export interface SetupAccountError {
  error: string;
  code:  string;
}

export type SetupAccountResult =
  | { ok: true;  data:  SetupAccountSuccess }
  | { ok: false; error: SetupAccountError };

// ── Client function ───────────────────────────────────────────

export async function setupAccount(
  input: SetupAccountInput,
): Promise<SetupAccountResult> {
  // Basic client-side validation before hitting the network
  if (!input.user_id.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", error: "user_id is required" } };
  }
  if (!input.venue_name.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", error: "venue_name is required" } };
  }

  let res: Response;
  try {
    res = await fetch("/api/setup-account", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(input),
    });
  } catch (networkErr) {
    return {
      ok: false,
      error: {
        code:  "NETWORK_ERROR",
        error: "Could not reach the server. Check your internet connection.",
      },
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: { code: "PARSE_ERROR", error: "Server returned an invalid response" },
    };
  }

  if (!res.ok) {
    const err = json as SetupAccountError;
    return { ok: false, error: err };
  }

  return { ok: true, data: json as SetupAccountSuccess };
}
