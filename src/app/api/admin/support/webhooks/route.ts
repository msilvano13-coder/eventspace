import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("id, stripe_event_id, event_type, processed_at")
    .order("processed_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }

  return NextResponse.json({ webhooks: data || [] });
}
