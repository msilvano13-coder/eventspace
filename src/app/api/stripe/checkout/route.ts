import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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

    const { plan } = (await request.json()) as {
      plan: "diy" | "professional";
    };

    if (plan !== "diy" && plan !== "professional") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Look up existing profile for stripe_customer_id and current plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    // Prevent duplicate purchases
    if (profile?.plan === plan) {
      return NextResponse.json(
        { error: `You already have the ${plan === "diy" ? "DIY" : "Professional"} plan.` },
        { status: 400 }
      );
    }

    // DIY is standalone — cannot upgrade to Professional
    if (profile?.plan === "diy" && plan === "professional") {
      return NextResponse.json(
        { error: "DIY plans cannot be upgraded to Professional." },
        { status: 400 }
      );
    }

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Store the customer ID
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateErr) {
        console.error("Failed to save stripe_customer_id:", updateErr);
        return NextResponse.json(
          { error: "Failed to link payment account. Please try again." },
          { status: 500 }
        );
      }
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
