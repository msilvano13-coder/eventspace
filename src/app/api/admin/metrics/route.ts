import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, planner_name, plan, trial_ends_at, created_at");

  if (!profiles) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalUsers = profiles.length;
  const activeTrials = profiles.filter(
    (p) =>
      p.plan === "trial" &&
      p.trial_ends_at &&
      new Date(p.trial_ends_at) > now
  ).length;
  const professionalUsers = profiles.filter((p) => p.plan === "professional").length;
  const diyUsers = profiles.filter((p) => p.plan === "diy").length;
  const expiredUsers = profiles.filter((p) => p.plan === "expired").length;
  const mrr = professionalUsers * 20;

  const planDistribution = {
    trial: profiles.filter((p) => p.plan === "trial").length,
    professional: professionalUsers,
    diy: diyUsers,
    expired: expiredUsers,
    pending: profiles.filter((p) => p.plan === "pending").length,
  };

  const recentSignups = profiles
    .filter((p) => new Date(p.created_at) > thirtyDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((p) => ({
      email: p.email,
      name: p.planner_name,
      plan: p.plan,
      createdAt: p.created_at,
    }));

  return NextResponse.json({
    totalUsers,
    activeTrials,
    professionalUsers,
    diyUsers,
    expiredUsers,
    mrr,
    planDistribution,
    recentSignups,
  });
}
