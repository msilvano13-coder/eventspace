import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Extract IP and user agent from request headers
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;
    const userAgent = request.headers.get("user-agent") ?? null;

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
        metadata: metadata ?? {},
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
