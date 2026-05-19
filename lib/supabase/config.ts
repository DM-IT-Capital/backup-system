function rawEnv(name: string) {
  try {
    if (typeof process === "undefined" || !process.env) {
      return undefined;
    }

    return process.env[name];
  } catch {
    return undefined;
  }
}

function stripWrappingQuotes(value: string) {
  let cleaned = value.trim();

  for (const quote of ['"', "'", "`"]) {
    if (cleaned.startsWith(quote) && cleaned.endsWith(quote) && cleaned.length >= 2) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  return cleaned;
}

function readEnv(name: string) {
  const value = rawEnv(name);

  if (!value) {
    return undefined;
  }

  let cleaned = stripWrappingQuotes(value);

  // Be forgiving if the whole .env line was pasted into the Vercel value box.
  // Example value: NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co
  const assignmentPrefix = `${name}=`;
  if (cleaned.startsWith(assignmentPrefix)) {
    cleaned = stripWrappingQuotes(cleaned.slice(assignmentPrefix.length));
  }

  return cleaned;
}

function readSupabaseUrl() {
  const value = readEnv("NEXT_PUBLIC_SUPABASE_URL");

  if (!value) {
    return undefined;
  }

  // If the value accidentally contains surrounding text, recover the first URL.
  const urlMatch = value.match(/https?:\/\/[^\s'"`<>]+/);
  if (urlMatch) {
    return urlMatch[0].replace(/[),.;]+$/, "");
  }

  return value;
}

export function getSupabaseConfigError() {
  const url = readSupabaseUrl();
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url) {
    return "NEXT_PUBLIC_SUPABASE_URL is missing.";
  }

  if (!anonKey) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.";
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "NEXT_PUBLIC_SUPABASE_URL must be the Supabase Project URL, not DATABASE_URL. It should look like https://xxxxx.supabase.co.";
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return "NEXT_PUBLIC_SUPABASE_URL must start with https://.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Use the Project URL from Supabase settings, for example https://xxxxx.supabase.co.";
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
    url: readSupabaseUrl()!,
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")!
  };
}
