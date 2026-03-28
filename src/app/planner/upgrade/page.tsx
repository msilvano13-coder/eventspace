"use client";

import { usePlannerProfile } from "@/hooks/useStore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Loader2 } from "lucide-react";

const DIY_FEATURES = [
  "1 active event",
  "Floor plan editor",
  "Guest management & RSVPs",
  "Day-of timeline",
  "Vendor tracking & search",
  "Contracts & budget",
  "Color palette & mood board",
  "Shared files",
  "Read-only vendor link",
];

const PRO_FEATURES = [
  "Unlimited events",
  "Inquiries & leads pipeline",
  "Client questionnaires",
  "Invoicing & payment tracking",
  "Financial reports & dashboard",
  "Calendar view (all events)",
  "Preferred vendors list",
  "Contract templates",
  "Branded client portal",
  "CSV import & export",
  "Priority support",
];

export default function UpgradePage() {
  const profile = usePlannerProfile();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<"diy" | "professional" | null>(
    null
  );

  // DIY is a standalone plan — no upgrade path
  if (profile.plan === "diy") {
    router.replace("/planner");
    return null;
  }

  const trialDaysLeft =
    profile.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(profile.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const isExpired =
    profile.plan === "expired" ||
    (profile.plan === "trial" && trialDaysLeft <= 0);

  async function handleSelectPlan(plan: "diy" | "professional") {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
        setLoadingPlan(null);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Sparkles size={14} />
          {isExpired ? "Your trial has ended" : "Upgrade your plan"}
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
          {isExpired
            ? "Continue Planning with EventSpace"
            : "Choose Your Plan"}
        </h1>
        <p className="text-stone-500 max-w-lg mx-auto">
          {isExpired
            ? "Pick a plan to keep access to all your events and data."
            : "One event or a whole business — pick the plan that fits."}
        </p>
        {!isExpired && profile.plan === "trial" && trialDaysLeft > 0 && (
          <p className="mt-3 text-sm text-stone-400">
            You have{" "}
            <span className="font-semibold text-rose-500">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}
            </span>{" "}
            remaining on your trial.
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* DIY */}
        <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200 shadow-soft flex flex-col">
          <h3 className="font-heading text-xl font-semibold text-stone-900">
            DIY
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Plan your own event, your way
          </p>
          <p className="mt-6">
            <span className="font-heading text-4xl font-bold text-stone-900">
              $99
            </span>
            <span className="text-stone-400 text-sm"> one-time</span>
          </p>
          <button
            onClick={() => handleSelectPlan("diy")}
            disabled={loadingPlan !== null}
            className="mt-6 flex items-center justify-center gap-2 font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            {loadingPlan === "diy" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              "Select Plan"
            )}
          </button>
          <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">
            Perfect for one event
          </p>
          <ul className="space-y-3 text-sm text-stone-600">
            {DIY_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check
                  size={16}
                  className="shrink-0 text-emerald-500 mt-0.5"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Professional */}
        <div className="bg-white rounded-2xl p-8 border-2 border-rose-500 shadow-lg relative flex flex-col">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            For Professionals
          </span>
          <h3 className="font-heading text-xl font-semibold text-stone-900">
            Professional
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Everything you need to run a planning business
          </p>
          <p className="mt-6">
            <span className="font-heading text-4xl font-bold text-stone-900">
              $20
            </span>
            <span className="text-stone-400 text-sm"> / month</span>
          </p>
          <button
            onClick={() => handleSelectPlan("professional")}
            disabled={loadingPlan !== null}
            className="mt-6 flex items-center justify-center gap-2 font-medium text-white bg-rose-500 hover:bg-rose-600 px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50"
          >
            {loadingPlan === "professional" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              "Select Plan"
            )}
          </button>
          <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">
            Everything in DIY, plus
          </p>
          <ul className="space-y-3 text-sm text-stone-600">
            {PRO_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check
                  size={16}
                  className="shrink-0 text-emerald-500 mt-0.5"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-center text-xs text-stone-400 mt-8">
        Secure payment powered by Stripe. Cancel anytime.
      </p>
    </div>
  );
}
