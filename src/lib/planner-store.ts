"use client";

import { PlannerProfile } from "./types";
import { fetchProfile, updateProfile as dbUpdateProfile } from "@/lib/supabase/db";

type Listener = () => void;

const DEFAULT_PROFILE: PlannerProfile = {
  businessName: "",
  plannerName: "",
  email: "",
  phone: "",
  website: "",
  logoUrl: "",
  brandColor: "#e88b8b",
  tagline: "",
  plan: "trial",
  trialEndsAt: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePaymentId: null,
};

class PlannerProfileStore {
  private profile: PlannerProfile = { ...DEFAULT_PROFILE };
  private listeners = new Set<Listener>();
  private hydrated = false;
  private hydrating = false;
  private _loading = true;

  get isLoading(): boolean {
    return this._loading;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated || this.hydrating) return;
    this.hydrating = true;
    if (typeof window === "undefined") {
      this.hydrating = false;
      return;
    }
    try {
      const fetched = await fetchProfile();
      if (fetched) {
        this.profile = { ...DEFAULT_PROFILE, ...fetched };
      }
    } catch (err) {
      console.error("[PlannerProfileStore] hydrate failed:", err);
      this.profile = { ...DEFAULT_PROFILE };
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.emit();
  }

  getSnapshot = (): PlannerProfile => {
    return this.profile;
  };

  async update(partial: Partial<PlannerProfile>): Promise<void> {
    this.profile = { ...this.profile, ...partial };
    this.emit();
    try {
      await dbUpdateProfile(partial);
    } catch (err) {
      console.error("[PlannerProfileStore] update failed:", err);
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (!this.hydrated && !this.hydrating) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const plannerStore = new PlannerProfileStore();
