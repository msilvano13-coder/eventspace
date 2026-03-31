import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRO_ONLY_ROUTES } from "@/lib/plan-features";

const PROFILE_CACHE_COOKIE = "es_profile_cache";
const PROFILE_CACHE_MAX_AGE = 15 * 60; // 15 minutes in seconds

interface CachedProfile {
  plan: string;
  trialEndsAt: string | null;
  ts: number;
}

// ── HMAC cookie signing (Edge-compatible via Web Crypto API) ──
const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) {
  console.error(
    "[SECURITY] COOKIE_SECRET env var is not set. Profile cache cookies will be disabled. " +
    "Set a strong random secret in production to enable middleware caching."
  );
}

async function getHmacKey(): Promise<CryptoKey | null> {
  if (!COOKIE_SECRET) return null;
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(COOKIE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signCookie(payload: string): Promise<string | null> {
  const key = await getHmacKey();
  if (!key) return null;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${bufToHex(sig)}`;
}

async function verifyCookie(signed: string): Promise<string | null> {
  const key = await getHmacKey();
  if (!key) return null;
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = bufToHex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );
  // Constant-time comparison
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? payload : null;
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
        const verified = await verifyCookie(cachedRaw);
        if (verified) {
          const cached: CachedProfile = JSON.parse(verified);
          const age = (Date.now() - cached.ts) / 1000;
          if (age < PROFILE_CACHE_MAX_AGE) {
            plan = cached.plan;
            trialEndsAt = cached.trialEndsAt;
            needsFetch = false;
          }
        }
      } catch (e) {
        console.warn("[middleware] Invalid profile cache cookie, will re-fetch:", e);
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

      // Cache profile in a short-lived HMAC-signed cookie (only if COOKIE_SECRET is set)
      const cacheValue: CachedProfile = {
        plan: profile.plan,
        trialEndsAt: profile.trial_ends_at,
        ts: Date.now(),
      };
      const signedValue = await signCookie(JSON.stringify(cacheValue));
      if (signedValue) {
        supabaseResponse.cookies.set(PROFILE_CACHE_COOKIE, signedValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: PROFILE_CACHE_MAX_AGE,
          path: "/",
        });
      }
    }

    const isPending = plan === "pending";
    const isExpired = plan === "expired";
    const isTrialOver =
      plan === "trial" &&
      (!trialEndsAt || new Date(trialEndsAt).getTime() < Date.now());

    if (isPending || isExpired || isTrialOver) {
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
