import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = (await request.json()) as {
      plan: "diy" | "professional";
    };

    if (plan !== "diy" && plan !== "professional") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Look up existing profile for stripe_customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Store the customer ID
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = new URL(request.url).origin;

    if (plan === "diy") {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price: process.env.STRIPE_PRICE_DIY!,
            quantity: 1,
          },
        ],
        success_url: `${origin}/planner/settings?session_id={CHECKOUT_SESSION_ID}&plan=diy`,
        cancel_url: `${origin}/planner/settings`,
        metadata: {
          supabase_user_id: user.id,
          plan: "diy",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // Professional — subscription, no Stripe trial (app trial covers first 30 days)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_configuration: undefined,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_PROFESSIONAL!,
          quantity: 1,
        },
      ],
      success_url: `${origin}/planner/settings?session_id={CHECKOUT_SESSION_ID}&plan=professional`,
      cancel_url: `${origin}/planner/settings`,
      metadata: {
        supabase_user_id: user.id,
        plan: "professional",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
