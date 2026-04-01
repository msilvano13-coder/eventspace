import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const userId = params.userId;

  try {
    // 1. Get profile for Stripe cleanup
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, email")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Cancel Stripe subscription
    if (profile.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (err) {
        console.error("[admin-delete] Failed to cancel Stripe subscription:", err);
      }
    }

    // 3. Delete Stripe customer
    if (profile.stripe_customer_id) {
      try {
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (err) {
        console.error("[admin-delete] Failed to delete Stripe customer:", err);
      }
    }

    // 4. Delete storage files
    const deleteStorageRecursive = async (bucket: string, prefix: string) => {
      const { data: items } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 });
      if (!items || items.length === 0) return;

      const files = items.filter(item => item.id !== null);
      const folders = items.filter(item => item.id === null);

      if (files.length > 0) {
        await supabaseAdmin.storage.from(bucket).remove(
          files.map(f => `${prefix}/${f.name}`)
        );
      }

      for (const folder of folders) {
        await deleteStorageRecursive(bucket, `${prefix}/${folder.name}`);
      }
    };

    try {
      await deleteStorageRecursive("event-files", userId);
      await deleteStorageRecursive("brand-assets", userId);
      await deleteStorageRecursive("contract-templates", userId);
    } catch (err) {
      console.error("[admin-delete] Storage cleanup failed:", err);
    }

    // 5. Delete event-related data
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("user_id", userId);

    const eventIds = events?.map((e) => e.id) || [];

    if (eventIds.length > 0) {
      const eventTables = [
        "guests", "vendors", "vendor_payments", "timeline_items",
        "schedule_items", "floor_plans", "lighting_zones", "expenses",
        "budget_items", "invoices", "invoice_line_items", "event_contracts",
        "shared_files", "mood_board_images", "messages", "discovered_vendors",
        "questionnaire_assignments", "contract_audit_log", "guest_relationships",
      ];

      for (const table of eventTables) {
        const { error } = await supabaseAdmin.from(table).delete().in("event_id", eventIds);
        if (error) console.warn(`[admin-delete] Skipping ${table}:`, error.message);
      }

      await supabaseAdmin.from("events").delete().eq("user_id", userId);
    }

    // 6. Delete planner-level data
    const plannerTables = ["questionnaires", "inquiries", "preferred_vendors", "contract_templates"];
    for (const table of plannerTables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) console.warn(`[admin-delete] Skipping ${table}:`, error.message);
    }

    // 7. Delete team memberships
    await supabaseAdmin.from("team_members").delete().eq("user_id", userId);
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);

    // 8. Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 9. Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[admin-delete] Failed to delete auth user:", deleteError);
      return NextResponse.json({ error: "Failed to delete auth user" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email: profile.email });
  } catch (error) {
    console.error("[admin-delete] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
