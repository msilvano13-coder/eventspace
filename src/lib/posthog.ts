"use client";

import posthog from "posthog-js";

export const POSTHOG_KEY = "phc_rlFoki2FQZK8xbHsZ4XPnUasF9OBK69viSWqxjZ28CV";
export const POSTHOG_HOST = "https://us.i.posthog.com";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
}

export default posthog;
