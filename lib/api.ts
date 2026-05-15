import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedSupabase() {
  if (!hasSupabaseConfig()) {
    return { supabase: null, userId: null, demo: true as const };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null, demo: false as const };
  }

  return { supabase, userId: user.id, demo: false as const };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function demoAccepted(payload: unknown) {
  return NextResponse.json({ accepted: true, demo: true, payload }, { status: 202 });
}
