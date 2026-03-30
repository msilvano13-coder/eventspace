import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { validateOrigin } from "@/lib/api-security";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/stripe/verify-session
 * Called after checkout redirect to ensure the plan is updated immediately,
 * rather than waiting for the async webhook delivery.
 */
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

    const { sessionId } = (await request.json()) as { sessionId: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify this session belongs to the current user
    if (session.metadata?.supabase_user_id !== user.id) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    if (session.status !== "complete") {
      return NextResponse.json({ error: "Session not complete" }, { status: 400 });
    }

    const plan = session.metadata?.plan as "diy" | "professional";
    if (!plan) {
      return NextResponse.json({ error: "No plan in session" }, { status: 400 });
    }

    // For one-time payments (DIY), only update if payment is confirmed.
    // "no_payment_required" covers 100%-off promo codes where Stripe skips payment.
    // If not yet paid, the webhook will handle it when payment confirms.
    if (session.mode === "payment" && session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ plan, pending: true });
    }

    const updateData: Record<string, unknown> = {
      plan,
      stripe_customer_id: session.customer as string,
    };

    if (plan === "diy") {
      updateData.stripe_payment_id = session.payment_intent as string;
    } else {
      updateData.stripe_subscription_id = session.subscription as string;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("verify-session update failed:", error);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }

    // Clear the middleware profile cache cookie so the updated plan takes effect immediately
    const response = NextResponse.json({ plan });
    response.cookies.set("es_profile_cache", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("verify-session error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
