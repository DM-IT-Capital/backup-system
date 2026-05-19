import { NextResponse } from "next/server";
import { getSupabaseConfig, getSupabaseConfigError } from "@/lib/supabase/config";

function mask(value: string) {
  if (value.length <= 12) {
    return `${value.length} chars`;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)} (${value.length} chars)`;
}

export function GET() {
  const error = getSupabaseConfigError();

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }

  const { url, anonKey } = getSupabaseConfig();
  const parsedUrl = new URL(url);

  return NextResponse.json({
    ok: true,
    supabaseUrl: {
      protocol: parsedUrl.protocol,
      host: parsedUrl.host
    },
    anonKey: mask(anonKey)
  });
}
