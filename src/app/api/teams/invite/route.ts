import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/api-security";
import { sendTeamInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = (await request.json()) as { email: string };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Fetch team + verify ownership
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json(
      { error: "No team found. Please subscribe to a Teams plan first." },
      { status: 400 }
    );
  }

  // Check member count
  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team.id)
    .in("status", ["pending", "active"]);

  if ((count ?? 0) >= team.max_members) {
    return NextResponse.json(
      { error: `Team is full (${team.max_members} members max). Upgrade to add more.` },
      { status: 400 }
    );
  }

  // Prevent self-invite
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You can't invite yourself to your own team." },
      { status: 400 }
    );
  }

  // Insert member (unique constraint on team_id + email handles duplicates)
  const { data: member, error } = await supabase
    .from("team_members")
    .insert({
      team_id: team.id,
      email: email.toLowerCase(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This person has already been invited." },
        { status: 400 }
      );
    }
    console.error("Team invite insert failed:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }

  // Build invite URL
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : new URL(request.url).origin);

  const inviteUrl = `${origin}/invite/${member.invite_token}`;

  // Fetch inviter name for email
  const { data: profile } = await supabase
    .from("profiles")
    .select("planner_name, business_name")
    .eq("id", user.id)
    .single();

  const inviterName = profile?.planner_name || profile?.business_name || "A planner";

  await sendTeamInviteEmail({
    to: email,
    inviterName,
    teamName: team.name,
    inviteUrl,
  });

  return NextResponse.json({ success: true, member });
}
