import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const publicPaths = ["/login", "/auth/callback"];

function redirectToLogin(request: NextRequest, error?: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";

  if (request.nextUrl.pathname !== "/login") {
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
  }

  if (error) {
    redirectUrl.searchParams.set("error", error);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  const isApi = pathname.startsWith("/api/");

  try {
    const { url, anonKey } = getSupabaseConfig();
    let response = NextResponse.next({ request });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user && !isPublic && !isApi) {
      return redirectToLogin(request);
    }

    if (user && pathname === "/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error("Supabase middleware failed", error);

    if (isPublic || isApi) {
      return NextResponse.next({ request });
    }

    return redirectToLogin(
      request,
      "Unable to start Supabase auth. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy without build cache."
    );
  }
}
