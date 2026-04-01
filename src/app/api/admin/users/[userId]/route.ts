import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, planner_name, business_name, plan, trial_ends_at, stripe_customer_id, stripe_subscription_id, created_at")
    .eq("id", params.userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, name, date, client_name, status, archived_at, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ profile, events: events || [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.plan) {
    const validPlans = ["trial", "diy", "professional", "expired", "pending"];
    if (!validPlans.includes(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    updates.plan = body.plan;
  }

  if (body.extendTrial) {
    // Extend trial by 30 days from now or from current trial end, whichever is later
    const { data: current } = await supabaseAdmin
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", params.userId)
      .single();

    const now = new Date();
    const currentEnd = current?.trial_ends_at ? new Date(current.trial_ends_at) : now;
    const base = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    updates.trial_ends_at = newEnd.toISOString();
    updates.plan = "trial";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", params.userId);

  if (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
