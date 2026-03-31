import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/stripe/checkout-complete?session_id=...
 * Server-side redirect after Stripe checkout. Uses the Stripe session metadata
 * (supabase_user_id, plan) to update the DB — no auth cookies required.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const sessionId = url.searchParams.get("session_id");

  console.log("[checkout-complete] HIT — sessionId:", sessionId, "origin:", origin);

  if (!sessionId) {
    console.error("checkout-complete: no session_id");
    return NextResponse.redirect(`${origin}/planner/upgrade`);
  }

  try {
    // Retrieve the Stripe session — this is the source of truth
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const userId = session.metadata?.supabase_user_id;
    const plan = session.metadata?.plan as "diy" | "professional" | undefined;

    if (!userId || !plan) {
      console.error("checkout-complete: missing metadata", {
        userId,
        plan,
        sessionId,
      });
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    if (session.status !== "complete") {
      console.warn("checkout-complete: session not complete", {
        status: session.status,
        sessionId,
      });
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    // For one-time payments (DIY), only update if payment is confirmed
    if (
      session.mode === "payment" &&
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      console.warn("checkout-complete: payment pending", {
        payment_status: session.payment_status,
        sessionId,
      });
      // Redirect to settings with session_id so client-side can poll
      return NextResponse.redirect(
        `${origin}/planner/settings?session_id=${sessionId}&plan=${plan}`
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      plan,
      stripe_customer_id: session.customer as string,
    };

    if (plan === "diy") {
      updateData.stripe_payment_id = session.payment_intent as string;
    } else {
      updateData.stripe_subscription_id = session.subscription as string;
    }

    // Update the profile using admin client (no auth needed)
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("checkout-complete: profile update failed", {
        error,
        userId,
        plan,
      });
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    console.log(`checkout-complete: SUCCESS — updated ${userId} to plan=${plan}`);

    // Clear the middleware profile cache cookie and redirect to dashboard
    const response = NextResponse.redirect(`${origin}/planner`);
    response.cookies.set("es_profile_cache", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("checkout-complete: unexpected error", err);
    return NextResponse.redirect(`${origin}/planner/upgrade`);
  }
}
