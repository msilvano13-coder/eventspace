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
      plan: "diy" | "professional" | "teams_5" | "teams_10";
    };

    const VALID_PLANS = ["diy", "professional", "teams_5", "teams_10"] as const;
    if (!VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Look up existing profile for stripe_customer_id and current plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    // Prevent duplicate purchases (solo pro only — team upgrades handled separately)
    if (profile?.plan === plan && plan === "diy") {
      return NextResponse.json(
        { error: "You already have the DIY plan." },
        { status: 400 }
      );
    }

    // DIY is standalone — cannot upgrade
    if (profile?.plan === "diy") {
      return NextResponse.json(
        { error: "DIY plans cannot be upgraded." },
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

    // Use NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL for reliable origin
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : new URL(request.url).origin);
    console.log("[checkout] origin:", origin, "user:", user.id, "plan:", plan);

    if (plan === "diy") {
      const successUrl = `${origin}/api/stripe/checkout-complete?session_id={CHECKOUT_SESSION_ID}`;
      console.log("[checkout] DIY success_url:", successUrl);
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        allow_promotion_codes: true,
        line_items: [
          {
            price: process.env.STRIPE_PRICE_DIY!,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: `${origin}/planner/upgrade`,
        metadata: {
          supabase_user_id: user.id,
          plan: "diy",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // Subscription plans: professional, teams_5, teams_10
    const priceMap: Record<string, string> = {
      professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
      teams_5: process.env.STRIPE_PRICE_TEAMS_5!,
      teams_10: process.env.STRIPE_PRICE_TEAMS_10!,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const isTeamPlan = plan === "teams_5" || plan === "teams_10";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/api/stripe/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/planner/upgrade`,
      metadata: {
        supabase_user_id: user.id,
        plan: "professional",
        ...(isTeamPlan ? { team_plan: plan } : {}),
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
