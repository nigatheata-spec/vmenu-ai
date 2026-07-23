import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "MISSING";
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  return NextResponse.json({
    supabase_url:  url,
    anon_key_prefix:  anon.slice(0, 20) + "...",
    svc_key_prefix:   svc.slice(0, 20) + "...",
    node_env: process.env.NODE_ENV,
  });
}
