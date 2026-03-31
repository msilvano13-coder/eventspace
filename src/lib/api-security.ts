import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ── CSRF Protection: Origin header validation ──
// Rejects cross-origin POST/PUT/PATCH/DELETE requests that don't match our host.
// Stripe webhooks use a signature-based auth, so they're excluded.

export function validateOrigin(request: Request | NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests with no Origin header (same-origin fetch, server-to-server)
  if (!origin) return null;

  // Compare origin's host to the Host header
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
  } catch {
    // Malformed origin — reject
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── Supabase-backed rate limiter (shared across serverless instances) ──
// Uses a `rate_limits` table + `check_rate_limit` RPC for atomic check-and-increment.
// Falls back to in-memory limiter if Supabase call fails (network error, etc.)

const fallbackMap = new Map<string, { count: number; resetAt: number }>();
const MAX_FALLBACK = 5_000;

function fallbackRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = fallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    if (fallbackMap.size >= MAX_FALLBACK) {
      fallbackMap.forEach((e, k) => { if (now > e.resetAt) fallbackMap.delete(k); });
      if (fallbackMap.size >= MAX_FALLBACK) return true;
    }
    fallbackMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

interface RateLimitOptions {
  /** Unique name for this limiter (e.g., "audit", "upload") */
  name: string;
  /** Max requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export async function isRateLimited(ip: string, opts: RateLimitOptions): Promise<boolean> {
  const key = `${opts.name}:${ip}`;
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: opts.max,
      p_window_ms: opts.windowMs,
    });
    if (error) throw error;
    // RPC returns true if ALLOWED, we return true if LIMITED
    return data === false;
  } catch {
    // Fallback to in-memory if Supabase is unreachable
    return fallbackRateLimit(key, opts.max, opts.windowMs);
  }
}

export function getClientIp(request: Request): string {
  // Vercel sets this header; fallback to x-forwarded-for
  return (
    (request.headers.get("x-vercel-forwarded-for") ??
      request.headers.get("x-forwarded-for"))
      ?.split(",")[0]
      .trim() ?? "unknown"
  );
}
