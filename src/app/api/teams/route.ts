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
    members = data ?? [];
  }

  // Fetch teams this user is a member of
  const { data: memberships } = await supabase
    .from("team_members")
    .select("*, teams(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  return NextResponse.json({ team, members, memberships: memberships ?? [] });
}
