import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, plan")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      // DIY is a one-time payment — just downgrade in DB
      if (profile?.plan === "diy") {
        await supabase
          .from("profiles")
          .update({ plan: "expired", stripe_subscription_id: null })
          .eq("id", user.id);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel at end of current billing period (not immediately)
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stripe cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
