import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { validateOrigin } from "@/lib/api-security";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // CSRF protection
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again and retry." },
        { status: 401 }
      );
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

    // 2b. Delete Stripe customer
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (err) {
        console.error("Failed to delete Stripe customer:", err);
      }
    }

    // 3. Delete all storage files for this user
    const userId = user.id;
    try {
      // List and delete all files in event-files bucket under this user
      const { data: eventFiles } = await supabaseAdmin.storage.from("event-files").list(userId, { limit: 1000 });
      if (eventFiles && eventFiles.length > 0) {
        await supabaseAdmin.storage.from("event-files").remove(
          eventFiles.map(f => `${userId}/${f.name}`)
        );
      }

      // Delete brand assets (logo)
      const { data: brandFiles } = await supabaseAdmin.storage.from("brand-assets").list(userId, { limit: 10 });
      if (brandFiles && brandFiles.length > 0) {
        await supabaseAdmin.storage.from("brand-assets").remove(
          brandFiles.map(f => `${userId}/${f.name}`)
        );
      }

      // Delete contract templates
      const { data: templateFiles } = await supabaseAdmin.storage.from("contract-templates").list(userId, { limit: 100 });
      if (templateFiles && templateFiles.length > 0) {
        await supabaseAdmin.storage.from("contract-templates").remove(
          templateFiles.map(f => `${userId}/${f.name}`)
        );
      }
    } catch (err) {
      console.error("Storage cleanup during account deletion failed:", err);
      // Continue with deletion even if storage cleanup fails
    }

    // 4. Delete all user data from Supabase tables (order matters for foreign keys)
    // First get all event IDs for this user
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("user_id", user.id);

    const eventIds = events?.map((e) => e.id) || [];

    if (eventIds.length > 0) {
      // Delete event-related data (skip errors for tables that may not exist)
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
        const { error } = await supabaseAdmin.from(table).delete().in("event_id", eventIds);
        if (error) console.warn(`[delete-account] Skipping ${table}:`, error.message);
      }

      // Delete the events themselves
      const { error: eventsErr } = await supabaseAdmin.from("events").delete().eq("user_id", user.id);
      if (eventsErr) console.error("[delete-account] Failed to delete events:", eventsErr.message);
    }

    // Delete planner-level data (skip errors for tables that may not exist)
    const plannerTables = [
      "questionnaires",
      "inquiries",
      "preferred_vendors",
      "contract_templates",
    ];

    for (const table of plannerTables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", user.id);
      if (error) console.warn(`[delete-account] Skipping ${table}:`, error.message);
    }

    // 5. Delete webhook events
    await supabaseAdmin.from("stripe_webhook_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 6. Delete the profile
    const { error: profileErr } = await supabaseAdmin.from("profiles").delete().eq("id", user.id);
    if (profileErr) console.error("[delete-account] Failed to delete profile:", profileErr.message);

    // 7. Sign out all sessions before deleting the auth user
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.warn("[delete-account] Sign out failed (continuing):", err);
    }

    // 8. Delete the auth user (requires admin client)
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
