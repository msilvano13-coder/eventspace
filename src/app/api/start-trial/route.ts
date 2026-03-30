import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/api-security";

export async function POST(request: Request) {
  try {
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow starting a trial if user is on "trial" plan with no active trial
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.plan !== "trial") {
      return NextResponse.json(
        { error: "You already have an active plan." },
        { status: 400 }
      );
    }

    if (profile.trial_ends_at && new Date(profile.trial_ends_at).getTime() > Date.now()) {
      return NextResponse.json(
        { error: "You already have an active trial." },
        { status: 400 }
      );
    }

    // Start 30-day Professional trial
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ trial_ends_at: trialEndsAt })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Failed to start trial:", updateErr);
      return NextResponse.json(
        { error: "Failed to start trial. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, trialEndsAt });
  } catch (error: unknown) {
    console.error("Start trial error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start trial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
