import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

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


export async function getAuthenticatedAdminSupabase() {
  const auth = await getAuthenticatedSupabase();

  if (auth.demo || !auth.userId) {
    return { ...auth, admin: null, configError: null };
  }

  if (!hasSupabaseAdminConfig()) {
    return { ...auth, admin: null, configError: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel." };
  }

  try {
    return { ...auth, admin: createSupabaseAdminClient(), configError: null };
  } catch (error) {
    return {
      ...auth,
      admin: null,
      configError: error instanceof Error ? error.message : "Unable to start Supabase admin client."
    };
  }
}

export function serverConfigError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
