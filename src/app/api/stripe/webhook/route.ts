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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan as "diy" | "professional";
        const customerId = session.customer as string;

        if (!plan) break;

        // For one-time payments (DIY), only grant access if payment is confirmed
        if (session.mode === "payment" && session.payment_status !== "paid") {
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

        if (userId) {
          // Primary: match by user ID from metadata
          const { error, count } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", userId);
          if (error) console.error("checkout.session.completed update by userId failed:", error);
          if (count === 0) console.warn(`checkout.session.completed: no profile matched userId=${userId}`);
        } else if (customerId) {
          // Fallback: match by stripe_customer_id
          const { error, count } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId);
          if (error) console.error("checkout.session.completed update by customerId failed:", error);
          if (count === 0) console.warn(`checkout.session.completed: no profile matched customerId=${customerId}`);
        } else {
          console.error("checkout.session.completed: no userId or customerId available, cannot update plan");
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

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            plan: "expired",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
        if (error) console.error("customer.subscription.deleted update failed:", error);

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

  return NextResponse.json({ received: true });
}
