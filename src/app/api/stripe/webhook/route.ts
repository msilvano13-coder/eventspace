import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Idempotency: atomic claim via INSERT (unique constraint on stripe_event_id)
  // If another instance already claimed this event, the INSERT fails and we skip.
  // Only skip on unique constraint violations (code 23505), NOT on missing table or other errors.
  const { error: claimError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ stripe_event_id: event.id, event_type: event.type });

  if (claimError) {
    if (claimError.code === "23505") {
      // Unique constraint violation = genuine duplicate delivery — skip
      console.log(`Webhook event ${event.id} already processed (deduplicated)`);
      return NextResponse.json({ received: true, deduplicated: true });
    }
    // Any other error (missing table, permission, etc.) — log but continue processing
    console.warn(`Webhook idempotency insert failed (non-duplicate): ${claimError.code} ${claimError.message}. Processing anyway.`);
  }

  // Diagnostic info for debugging (temporary)
  const debug: Record<string, unknown> = { eventType: event.type };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan as "diy" | "professional";
        const teamPlan = session.metadata?.team_plan as "teams_5" | "teams_10" | undefined;
        const customerId = session.customer as string;

        debug.sessionId = session.id;
        debug.userId = userId;
        debug.plan = plan;
        debug.customerId = customerId;
        debug.mode = session.mode;
        debug.paymentStatus = session.payment_status;
        debug.status = session.status;

        if (!plan) {
          debug.skippedReason = "no plan in metadata";
          break;
        }

        // For one-time payments (DIY), only grant access if payment is confirmed
        // "no_payment_required" covers 100%-off promo codes where Stripe skips payment.
        if (session.mode === "payment" && session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          debug.skippedReason = `payment_status=${session.payment_status}`;
          console.warn(`checkout.session.completed: payment_status=${session.payment_status} for session ${session.id}, deferring plan update`);
          break;
        }

        const updateData: Record<string, unknown> = {
          plan,
          stripe_customer_id: customerId,
        };

        if (plan === "diy") {
          updateData.stripe_payment_id = session.payment_intent as string;
        } else {
          updateData.stripe_subscription_id = session.subscription as string;
        }

        debug.updateData = updateData;

        if (userId) {
          // Primary: match by user ID from metadata
          const { error, data, count } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", userId)
            .select("id, plan")
            .single();
          debug.updateError = error;
          debug.updateResult = data;
          debug.updateCount = count;
          if (error) console.error("checkout.session.completed update by userId failed:", error);
        } else if (customerId) {
          // Fallback: match by stripe_customer_id
          const { error, data, count } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId)
            .select("id, plan")
            .single();
          debug.updateError = error;
          debug.updateResult = data;
          debug.updateCount = count;
          if (error) console.error("checkout.session.completed update by customerId failed:", error);
        } else {
          debug.skippedReason = "no userId or customerId";
          console.error("checkout.session.completed: no userId or customerId available, cannot update plan");
        }

        // Create or update team row for team plans
        if (teamPlan && userId) {
          const maxMembers = teamPlan === "teams_10" ? 10 : 5;
          const subscriptionId = session.subscription as string;

          // Fetch owner's business name to default as team name
          const { data: ownerProfile } = await supabaseAdmin
            .from("profiles")
            .select("business_name, planner_name")
            .eq("id", userId)
            .single();
          const defaultTeamName = ownerProfile?.business_name || ownerProfile?.planner_name || "";

          const { error: teamError } = await supabaseAdmin
            .from("teams")
            .upsert(
              {
                owner_id: userId,
                name: defaultTeamName,
                plan: teamPlan,
                max_members: maxMembers,
                stripe_subscription_id: subscriptionId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "owner_id" }
            );
          if (teamError) {
            console.error("checkout.session.completed team upsert failed:", teamError);
          }
          debug.teamPlan = teamPlan;
          debug.teamUpsertError = teamError;
        }

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        // Delayed payment methods (bank debits, etc.) confirm payment after checkout
        const asyncSession = event.data.object as Stripe.Checkout.Session;
        const asyncUserId = asyncSession.metadata?.supabase_user_id;
        const asyncPlan = asyncSession.metadata?.plan as "diy" | "professional";
        const asyncCustomerId = asyncSession.customer as string;

        if (!asyncPlan) break;

        const asyncUpdateData: Record<string, unknown> = {
          plan: asyncPlan,
          stripe_customer_id: asyncCustomerId,
        };
        if (asyncPlan === "diy") {
          asyncUpdateData.stripe_payment_id = asyncSession.payment_intent as string;
        } else {
          asyncUpdateData.stripe_subscription_id = asyncSession.subscription as string;
        }

        if (asyncUserId) {
          const { error } = await supabaseAdmin.from("profiles").update(asyncUpdateData).eq("id", asyncUserId);
          if (error) console.error("async_payment_succeeded update failed:", error);
        } else if (asyncCustomerId) {
          const { error } = await supabaseAdmin.from("profiles").update(asyncUpdateData).eq("stripe_customer_id", asyncCustomerId);
          if (error) console.error("async_payment_succeeded fallback update failed:", error);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        // Delayed payment failed — revoke access
        const failedSession = event.data.object as Stripe.Checkout.Session;
        const failedUserId = failedSession.metadata?.supabase_user_id;
        const failedCustomerId = failedSession.customer as string;

        if (failedUserId) {
          const { error } = await supabaseAdmin.from("profiles").update({ plan: "expired" }).eq("id", failedUserId);
          if (error) console.error("async_payment_failed update failed:", error);
        } else if (failedCustomerId) {
          const { error } = await supabaseAdmin.from("profiles").update({ plan: "expired" }).eq("stripe_customer_id", failedCustomerId);
          if (error) console.error("async_payment_failed fallback update failed:", error);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) break;

        // Keep professional plan active on renewal
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ plan: "professional" })
          .eq("stripe_customer_id", customerId);
        if (error) console.error("invoice.payment_succeeded update failed:", error);

        break;
      }

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object as Stripe.Invoice;
        const failedInvCustomerId =
          typeof failedInvoice.customer === "string"
            ? failedInvoice.customer
            : failedInvoice.customer?.id;

        // Check attempt count — Stripe default is 3 retries
        const attemptCount = failedInvoice.attempt_count ?? 0;

        if (attemptCount >= 8) {
          // Final retry failed — expire the plan as a safety net (matches Stripe Smart Retry: 8 attempts)
          console.error(
            `invoice.payment_failed: final attempt (${attemptCount}) for customer ${failedInvCustomerId}. Expiring plan.`
          );
          if (failedInvCustomerId) {
            const { error } = await supabaseAdmin
              .from("profiles")
              .update({ plan: "expired" })
              .eq("stripe_customer_id", failedInvCustomerId);
            if (error) console.error("invoice.payment_failed expiry update failed:", error);
          }
        } else {
          console.warn(
            `invoice.payment_failed: attempt ${attemptCount} for customer ${failedInvCustomerId}. Stripe will retry.`
          );
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) break;

        // Find the user by stripe_customer_id to handle team cleanup
        const { data: expiredProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            plan: "expired",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
        if (error) console.error("customer.subscription.deleted update failed:", error);

        // Deactivate team and set all members to removed
        if (expiredProfile?.id) {
          const { data: team } = await supabaseAdmin
            .from("teams")
            .select("id")
            .eq("owner_id", expiredProfile.id)
            .single();

          if (team) {
            await supabaseAdmin
              .from("team_members")
              .update({ status: "removed" })
              .eq("team_id", team.id)
              .neq("status", "removed");

            await supabaseAdmin
              .from("teams")
              .delete()
              .eq("id", team.id);
          }
        }

        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true, debug });
}
