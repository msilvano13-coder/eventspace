import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch team owned by this user
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  let members: unknown[] = [];
  if (team) {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", team.id)
      .neq("status", "removed")
      .order("invited_at", { ascending: true });

    // Enrich active members with profile names
    const rawMembers = data ?? [];
    const activeUserIds = rawMembers
      .filter((m: { user_id: string | null }) => m.user_id)
      .map((m: { user_id: string }) => m.user_id);

    let profileMap: Record<string, string> = {};
    if (activeUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, planner_name")
        .in("id", activeUserIds);
      profileMap = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; planner_name: string }) => [p.id, p.planner_name])
      );
    }

    members = rawMembers.map((m: { user_id: string | null }) => ({
      ...m,
      name: m.user_id ? profileMap[m.user_id] || "" : "",
    }));
  }

  // Fetch teams this user is a member of
  const { data: memberships } = await supabase
    .from("team_members")
    .select("*, teams(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  return NextResponse.json({ team, members, memberships: memberships ?? [] });
}
