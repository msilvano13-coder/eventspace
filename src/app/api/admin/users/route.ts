import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase() || "";
  const planFilter = url.searchParams.get("plan") || "";

  // Fetch all profiles
  let query = supabaseAdmin
    .from("profiles")
    .select("id, email, planner_name, business_name, plan, trial_ends_at, stripe_customer_id, created_at")
    .order("created_at", { ascending: false });

  if (planFilter) {
    query = query.eq("plan", planFilter);
  }

  const { data: profiles, error } = await query;

  if (error || !profiles) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  // Fetch event counts per user
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("user_id");

  const eventCounts: Record<string, number> = {};
  if (events) {
    for (const e of events) {
      eventCounts[e.user_id] = (eventCounts[e.user_id] || 0) + 1;
    }
  }

  let users = profiles.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.planner_name,
    businessName: p.business_name,
    plan: p.plan,
    trialEndsAt: p.trial_ends_at,
    stripeCustomerId: p.stripe_customer_id,
    createdAt: p.created_at,
    eventCount: eventCounts[p.id] || 0,
  }));

  if (search) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.name.toLowerCase().includes(search) ||
        u.businessName.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ users });
}
