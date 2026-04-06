"use client";

import { usePlannerProfile } from "@/hooks/useStore";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { trackPlanPurchased } from "@/lib/analytics";

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

const TEAM_EXTRAS = [
  "Everything in Professional",
  "Assign team members to events",
  "Team activity notifications",
  "Team member dashboard",
];

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}

function UpgradeContent() {
  const profile = usePlannerProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightDiy = searchParams.get("plan") === "diy";
  const [loadingPlan, setLoadingPlan] = useState<"diy" | "professional" | "teams_5" | "teams_10" | null>(
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

  // Fresh signup: plan is 'pending' (new) or 'trial' with no trial_ends_at (legacy)
  const isFreshSignup = profile.plan === "pending" || (profile.plan === "trial" && !profile.trialEndsAt);

  const isExpired =
    profile.plan === "expired" ||
    (profile.plan === "trial" && !isFreshSignup && trialDaysLeft <= 0);

  async function handleSelectDiy() {
    setLoadingPlan("diy");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "diy" }),
      });
      const data = await res.json();
      if (data.url) {
        trackPlanPurchased("diy", 99);
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

  async function handleStartTrial() {
    setLoadingPlan("professional");
    try {
      const res = await fetch("/api/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        router.push("/planner");
      } else {
        alert(data.error || "Something went wrong");
        setLoadingPlan(null);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  }

  async function handleSubscribePro() {
    setLoadingPlan("professional");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "professional" }),
      });
      const data = await res.json();
      if (data.url) {
        trackPlanPurchased("professional", 20);
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

  async function handleSubscribeTeam(teamPlan: "teams_5" | "teams_10") {
    setLoadingPlan(teamPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: teamPlan }),
      });
      const data = await res.json();
      if (data.url) {
        trackPlanPurchased(teamPlan, teamPlan === "teams_5" ? 50 : 100);
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
          {isExpired ? "Your trial has ended" : isFreshSignup ? "Welcome to SoiréeSpace" : "Upgrade your plan"}
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
          {isExpired
            ? "Continue Planning with SoiréeSpace"
            : "Choose Your Plan"}
        </h1>
        <p className="text-stone-500 max-w-lg mx-auto">
          {isExpired
            ? "Pick a plan to keep access to all your events and data."
            : "One event or a whole business — pick the plan that fits."}
        </p>
        {!isExpired && !isFreshSignup && profile.plan === "trial" && trialDaysLeft > 0 && (
          <p className="mt-3 text-sm text-stone-400">
            You have{" "}
            <span className="font-semibold text-rose-500">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}
            </span>{" "}
            remaining on your trial.
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {/* DIY */}
        <div className={`rounded-2xl p-8 flex flex-col ${highlightDiy ? "bg-white border-2 border-rose-500 shadow-lg relative" : "bg-stone-50 border border-stone-200 shadow-soft"}`}>
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
            onClick={handleSelectDiy}
            disabled={loadingPlan !== null}
            className={`mt-6 flex items-center justify-center gap-2 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 ${highlightDiy ? "text-white bg-rose-500 hover:bg-rose-600 shadow-sm" : "text-stone-700 bg-white hover:bg-stone-100 border border-stone-200"}`}
          >
            {loadingPlan === "diy" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </>
            ) : highlightDiy ? (
              "Get Started — $99"
            ) : (
              "Buy Now"
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
        <div className={`rounded-2xl p-8 relative flex flex-col ${highlightDiy ? "bg-stone-50 border border-stone-200 shadow-soft" : "bg-white border-2 border-rose-500 shadow-lg"}`}>
          {!highlightDiy && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-medium px-3 py-1 rounded-full">
              For Professionals
            </span>
          )}
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
            onClick={isExpired ? handleSubscribePro : handleStartTrial}
            disabled={loadingPlan !== null}
            className={`mt-6 flex items-center justify-center gap-2 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 ${highlightDiy ? "text-stone-700 bg-white hover:bg-stone-100 border border-stone-200" : "text-white bg-rose-500 hover:bg-rose-600 shadow-sm"}`}
          >
            {loadingPlan === "professional" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {isExpired ? "Redirecting..." : "Starting trial..."}
              </>
            ) : isExpired ? (
              "Subscribe — $20/mo"
            ) : (
              "Start 30-Day Free Trial"
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

        {/* Pro Teams 5 */}
        <div className="rounded-2xl p-8 bg-stone-50 border border-stone-200 shadow-soft flex flex-col">
          <h3 className="font-heading text-xl font-semibold text-stone-900">
            Pro Teams
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            For small planning teams
          </p>
          <p className="mt-6">
            <span className="font-heading text-4xl font-bold text-stone-900">
              $50
            </span>
            <span className="text-stone-400 text-sm"> / month</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">Up to 5 team members</p>
          <button
            onClick={() => handleSubscribeTeam("teams_5")}
            disabled={loadingPlan !== null}
            className="mt-6 flex items-center justify-center gap-2 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 text-stone-700 bg-white hover:bg-stone-100 border border-stone-200"
          >
            {loadingPlan === "teams_5" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              "Subscribe — $50/mo"
            )}
          </button>
          <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">
            Professional, plus
          </p>
          <ul className="space-y-3 text-sm text-stone-600">
            {TEAM_EXTRAS.map((item) => (
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

        {/* Pro Teams 10 */}
        <div className="rounded-2xl p-8 bg-stone-50 border border-stone-200 shadow-soft flex flex-col">
          <h3 className="font-heading text-xl font-semibold text-stone-900">
            Pro Teams+
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            For larger planning firms
          </p>
          <p className="mt-6">
            <span className="font-heading text-4xl font-bold text-stone-900">
              $100
            </span>
            <span className="text-stone-400 text-sm"> / month</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">Up to 10 team members</p>
          <button
            onClick={() => handleSubscribeTeam("teams_10")}
            disabled={loadingPlan !== null}
            className="mt-6 flex items-center justify-center gap-2 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 text-stone-700 bg-white hover:bg-stone-100 border border-stone-200"
          >
            {loadingPlan === "teams_10" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              "Subscribe — $100/mo"
            )}
          </button>
          <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">
            Professional, plus
          </p>
          <ul className="space-y-3 text-sm text-stone-600">
            {TEAM_EXTRAS.map((item) => (
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
