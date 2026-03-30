import { NextResponse, type NextRequest } from "next/server";

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

// ── Shared rate limiter (per-IP, sliding window) ──
const rateLimitMaps = new Map<string, Map<string, { count: number; resetAt: number }>>();
const MAX_ENTRIES = 10_000;

interface RateLimitOptions {
  /** Unique name for this limiter (e.g., "audit", "upload") */
  name: string;
  /** Max requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export function isRateLimited(ip: string, opts: RateLimitOptions): boolean {
  let map = rateLimitMaps.get(opts.name);
  if (!map) {
    map = new Map();
    rateLimitMaps.set(opts.name, map);
  }

  const now = Date.now();
  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    if (map.size >= MAX_ENTRIES) {
      map.forEach((e, k) => { if (now > e.resetAt) map!.delete(k); });
      if (map.size >= MAX_ENTRIES) return true;
    }
    map.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return false;
  }
  entry.count++;
  return entry.count > opts.max;
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
