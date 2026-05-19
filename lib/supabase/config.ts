function readEnv(name: string) {
  try {
    if (typeof process === "undefined" || !process.env) {
      return undefined;
    }

    return process.env[name]?.trim();
  } catch {
    return undefined;
  }
}

export function getSupabaseConfigError() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url) {
    return "NEXT_PUBLIC_SUPABASE_URL is missing.";
  }

  if (!anonKey) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.";
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return "NEXT_PUBLIC_SUPABASE_URL must start with https://.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Use the Project URL from Supabase settings.";
  }

  return null;
}

export function hasSupabaseConfig() {
  return getSupabaseConfigError() === null;
}

export function getSupabaseConfig() {
  const error = getSupabaseConfigError();

  if (error) {
    throw new Error(error);
  }

  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL")!,
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")!
  };
}
