import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get profile to find Stripe customer ID and subscription
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    // 2. Cancel any active Stripe subscription
    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (err) {
        console.error("Failed to cancel Stripe subscription during account deletion:", err);
      }
    }

    // 3. Delete all user data from Supabase tables (order matters for foreign keys)
    // First get all event IDs for this user
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("planner_id", user.id);

    const eventIds = events?.map((e) => e.id) || [];

    if (eventIds.length > 0) {
      // Delete event-related data
      const eventTables = [
        "guests",
        "vendors",
        "vendor_payments",
        "timeline_items",
        "schedule_items",
        "floor_plans",
        "lighting_zones",
        "expenses",
        "budget_items",
        "invoices",
        "invoice_line_items",
        "event_contracts",
        "shared_files",
        "mood_board_images",
        "messages",
        "discovered_vendors",
        "questionnaire_assignments",
      ];

      for (const table of eventTables) {
        await supabaseAdmin.from(table).delete().in("event_id", eventIds);
      }

      // Delete the events themselves
      await supabaseAdmin.from("events").delete().eq("planner_id", user.id);
    }

    // Delete planner-level data
    const plannerTables = [
      "questionnaires",
      "inquiries",
      "preferred_vendors",
      "contract_templates",
    ];

    for (const table of plannerTables) {
      await supabaseAdmin.from(table).delete().eq("planner_id", user.id);
    }

    // 4. Delete the profile
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    // 5. Delete the auth user (requires admin client)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }
}
