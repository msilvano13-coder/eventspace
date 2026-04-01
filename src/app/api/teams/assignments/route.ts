import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/api-security";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  // Get team owned by this user
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json({ assignments: [], members: [] });
  }

  // Fetch assignments for this event
  const { data: assignments } = await supabase
    .from("team_event_assignments")
    .select("*, team_members(id, email, role, status)")
    .eq("event_id", eventId)
    .eq("team_id", team.id);

  // Fetch all active members
  const { data: members } = await supabase
    .from("team_members")
    .select("id, email, role, status")
    .eq("team_id", team.id)
    .eq("status", "active");

  return NextResponse.json({
    assignments: assignments ?? [],
    members: members ?? [],
  });
}

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

  const { eventId, memberId } = (await request.json()) as {
    eventId: string;
    memberId: string;
  };

  // Get team owned by this user
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "No team found" }, { status: 400 });
  }

  const { error } = await supabase.from("team_event_assignments").insert({
    team_id: team.id,
    event_id: eventId,
    member_id: memberId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already assigned" }, { status: 400 });
    }
    console.error("Assignment insert failed:", error);
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId, memberId } = (await request.json()) as {
    eventId: string;
    memberId: string;
  };

  // Get team owned by this user
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "No team found" }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_event_assignments")
    .delete()
    .eq("team_id", team.id)
    .eq("event_id", eventId)
    .eq("member_id", memberId);

  if (error) {
    console.error("Assignment delete failed:", error);
    return NextResponse.json({ error: "Failed to unassign" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
