"use client";

import posthog from "posthog-js";

// ── Conversion funnel events ──

export function trackSignupStarted(source: string) {
  posthog.capture("signup_started", { source });
}

export function trackSignupCompleted(plan?: string) {
  posthog.capture("signup_completed", { plan });
}

export function trackTrialActivated(plan: string) {
  posthog.capture("trial_activated", { plan });
}

export function trackPlanPurchased(plan: "diy" | "professional" | "teams_5" | "teams_10", amount: number) {
  posthog.capture("plan_purchased", { plan, amount });
}

// ── Blog events ──

export function trackBlogViewed(slug: string, category: string) {
  posthog.capture("blog_viewed", { slug, category });
}

// ── Product usage events ──

export function trackEventCreated() {
  posthog.capture("event_created");
}

export function trackFloorPlanOpened() {
  posthog.capture("floor_plan_opened");
}

export function trackContractSigned(actorType: "planner" | "client") {
  posthog.capture("contract_signed", { actor_type: actorType });
}

export function trackClientPortalViewed(eventId: string) {
  posthog.capture("client_portal_viewed", { event_id: eventId });
}

// ── User identification (call after auth) ──

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  posthog.identify(userId, properties);
}

export function resetUser() {
  posthog.reset();
}
