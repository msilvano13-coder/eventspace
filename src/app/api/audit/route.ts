import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateOrigin, isRateLimited, getClientIp } from "@/lib/api-security";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/audit — Log a contract audit entry from the client portal.
 * Uses share token for auth (clients are unauthenticated).
 * Service role bypasses RLS to insert the entry.
 */
export async function POST(request: Request) {
  try {
    // CSRF protection
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const clientIp = getClientIp(request);
    if (await isRateLimited(clientIp, { name: "audit", max: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { shareToken, eventId, contractId, action, metadata } = body;

    if (!shareToken || !eventId || !contractId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: shareToken, eventId, contractId, action" },
        { status: 400 }
      );
    }

    const VALID_ACTIONS = [
      "contract_created", "contract_viewed", "contract_downloaded",
      "disclosure_accepted", "signature_applied", "signature_removed",
      "signed_copy_uploaded", "contract_deleted",
    ];
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Validate share token
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("share_token", shareToken)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Invalid share token" }, { status: 401 });
    }

    // Extract IP (prefer Vercel header) and user agent
    const ipAddress = clientIp !== "unknown" ? clientIp : null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;

    // Sanitize metadata: only allow string values, cap keys and size
    const MAX_META_KEYS = 10;
    const MAX_META_VALUE_LEN = 500;
    const safeMeta: Record<string, string> = {};
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      const entries = Object.entries(metadata).slice(0, MAX_META_KEYS);
      for (const [k, v] of entries) {
        if (typeof v === "string") {
          safeMeta[k] = v.slice(0, MAX_META_VALUE_LEN);
        }
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("contract_audit_log")
      .insert({
        event_id: eventId,
        contract_id: contractId,
        user_id: null,
        actor_type: "client",
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: safeMeta,
      });

    if (insertError) {
      console.error("Audit log insert error:", insertError);
      return NextResponse.json({ error: "Failed to log audit entry" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in audit route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
