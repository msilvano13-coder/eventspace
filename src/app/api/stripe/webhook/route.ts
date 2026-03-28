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
          const { error } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", userId);
          if (error) console.error("checkout.session.completed update by userId failed:", error);
        } else if (customerId) {
          // Fallback: match by stripe_customer_id
          const { error } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId);
          if (error) console.error("checkout.session.completed update by customerId failed:", error);
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
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        console.warn(
          `invoice.payment_failed for customer ${customerId}. Stripe will retry; not expiring plan yet.`
        );

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
