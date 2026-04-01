import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/api-security";

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

  const { token } = (await request.json()) as { token: string };

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Use the SECURITY DEFINER function to accept the invite
  const { data, error } = await supabase.rpc("accept_team_invite", {
    p_token: token,
  });

  if (error) {
    console.error("Accept invite RPC failed:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }

  if (data?.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    teamId: data.teamId,
    teamName: data.teamName,
  });
}
