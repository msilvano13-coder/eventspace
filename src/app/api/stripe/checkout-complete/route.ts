import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/stripe/checkout-complete?session_id=...
 * Server-side redirect after Stripe checkout. Verifies payment and updates
 * the plan in the DB before the user sees any page — no client-side dependency.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(`${origin}/planner/upgrade`);
  }

  try {
    // Get the current user
    const supabase = createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/sign-in`);
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify this session belongs to the current user
    if (session.metadata?.supabase_user_id !== user.id) {
      console.error("checkout-complete: session user mismatch", {
        sessionUser: session.metadata?.supabase_user_id,
        currentUser: user.id,
      });
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    if (session.status !== "complete") {
      console.warn("checkout-complete: session not complete", { status: session.status });
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    const plan = session.metadata?.plan as "diy" | "professional";
    if (!plan) {
      console.error("checkout-complete: no plan in session metadata");
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    // For one-time payments (DIY), only update if payment is confirmed
    if (
      session.mode === "payment" &&
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      console.warn("checkout-complete: payment not yet confirmed", {
        payment_status: session.payment_status,
      });
      return NextResponse.redirect(`${origin}/planner/upgrade`);
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

    // Update the profile
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("checkout-complete: profile update failed", error);
      return NextResponse.redirect(`${origin}/planner/upgrade`);
    }

    console.log(`checkout-complete: updated ${user.id} to plan=${plan}`);

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
    console.error("checkout-complete error:", err);
    return NextResponse.redirect(`${origin}/planner/upgrade`);
  }
}
