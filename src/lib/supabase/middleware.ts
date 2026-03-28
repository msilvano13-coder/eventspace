import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRO_ONLY_ROUTES } from "@/lib/plan-features";

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
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // No profile row — treat as expired to force upgrade/contact support
      const url = request.nextUrl.clone();
      url.pathname = "/planner/upgrade";
      return NextResponse.redirect(url);
    } else {
      const isExpired = profile.plan === "expired";
      const isTrialOver =
        profile.plan === "trial" &&
        (!profile.trial_ends_at || new Date(profile.trial_ends_at).getTime() < Date.now());

      if (isExpired || isTrialOver) {
        const url = request.nextUrl.clone();
        url.pathname = "/planner/upgrade";
        return NextResponse.redirect(url);
      }

      // Block DIY users from Pro-only routes
      if (profile.plan === "diy" && PRO_ONLY_ROUTES.has(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/planner";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
