import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/api-security";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const { memberId } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the member belongs to a team owned by this user
  const { data: member } = await supabase
    .from("team_members")
    .select("*, teams!inner(owner_id)")
    .eq("id", memberId)
    .single();

  if (!member || (member.teams as { owner_id: string }).owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Remove member (soft delete)
  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed", invite_token: null })
    .eq("id", memberId);

  if (error) {
    console.error("Team member removal failed:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  // Also remove all event assignments for this member
  await supabase
    .from("team_event_assignments")
    .delete()
    .eq("member_id", memberId);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const { memberId } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = (await request.json()) as { role: string };
  const VALID_ROLES = ["coordinator", "assistant", "viewer"];
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Verify the member belongs to a team owned by this user
  const { data: member } = await supabase
    .from("team_members")
    .select("*, teams!inner(owner_id)")
    .eq("id", memberId)
    .single();

  if (!member || (member.teams as { owner_id: string }).owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
