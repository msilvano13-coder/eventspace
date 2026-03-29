import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRO_ONLY_ROUTES } from "@/lib/plan-features";

const PROFILE_CACHE_COOKIE = "es_profile_cache";
const PROFILE_CACHE_MAX_AGE = 5 * 60; // 5 minutes in seconds

interface CachedProfile {
  plan: string;
  trialEndsAt: string | null;
  ts: number;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /planner routes — redirect to sign-in if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/planner")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === "/sign-in" || request.nextUrl.pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/planner";
    return NextResponse.redirect(url);
  }

  // Paywall check for authenticated planner routes
  const pathname = request.nextUrl.pathname;
  if (
    user &&
    pathname.startsWith("/planner") &&
    pathname !== "/planner/upgrade" &&
    pathname !== "/planner/settings"
  ) {
    // Try to read cached profile from cookie to avoid DB hit on every request
    let plan: string | null = null;
    let trialEndsAt: string | null = null;
    let needsFetch = true;

    const cachedRaw = request.cookies.get(PROFILE_CACHE_COOKIE)?.value;
    if (cachedRaw) {
      try {
        const cached: CachedProfile = JSON.parse(cachedRaw);
        const age = (Date.now() - cached.ts) / 1000;
        if (age < PROFILE_CACHE_MAX_AGE) {
          plan = cached.plan;
          trialEndsAt = cached.trialEndsAt;
          needsFetch = false;
        }
      } catch {
        // Invalid cookie — will re-fetch
      }
    }

    if (needsFetch) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_ends_at")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const url = request.nextUrl.clone();
        url.pathname = "/planner/upgrade";
        return NextResponse.redirect(url);
      }

      plan = profile.plan;
      trialEndsAt = profile.trial_ends_at;

      // Cache profile in a short-lived cookie
      const cacheValue: CachedProfile = {
        plan: profile.plan,
        trialEndsAt: profile.trial_ends_at,
        ts: Date.now(),
      };
      supabaseResponse.cookies.set(PROFILE_CACHE_COOKIE, JSON.stringify(cacheValue), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: PROFILE_CACHE_MAX_AGE,
        path: "/",
      });
    }

    const isExpired = plan === "expired";
    const isTrialOver =
      plan === "trial" &&
      (!trialEndsAt || new Date(trialEndsAt).getTime() < Date.now());

    if (isExpired || isTrialOver) {
      const url = request.nextUrl.clone();
      url.pathname = "/planner/upgrade";
      return NextResponse.redirect(url);
    }

    // Block DIY users from Pro-only routes
    if (plan === "diy" && PRO_ONLY_ROUTES.has(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/planner";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
