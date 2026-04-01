import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, planner_name, business_name, plan, trial_ends_at, stripe_customer_id, stripe_subscription_id, created_at")
    .ilike("email", email)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, name, date, client_name, status, archived_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ profile, events: events || [] });
}
