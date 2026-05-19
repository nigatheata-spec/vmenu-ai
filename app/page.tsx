// app/page.tsx
// Root "/" — the public landing page.
// Always public — no redirect, no auth check.
// Middleware lets this through for everyone.
import Landing from "@/components/landing/Landing";

export default function RootPage() {
  return <Landing />;
}
