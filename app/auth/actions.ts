"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfigError, hasSupabaseConfig } from "@/lib/supabase/config";

export async function signIn(formData: FormData) {
  if (!hasSupabaseConfig()) {
    const configError = getSupabaseConfigError() ?? "Supabase is not configured";
    redirect(`/login?error=${encodeURIComponent(configError)}`);
  }

  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const next = String(formData.get("next") || "/");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
