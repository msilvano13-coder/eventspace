import { PlannerProfile } from "./types";

type Listener = () => void;

const STORAGE_KEY = "eventspace-planner-profile";

const DEFAULT_PROFILE: PlannerProfile = {
  businessName: "",
  plannerName: "",
  email: "",
  phone: "",
  website: "",
  logoUrl: "",
  brandColor: "#e88b8b",
  tagline: "",
};

class PlannerProfileStore {
  private profile: PlannerProfile = { ...DEFAULT_PROFILE };
  private listeners = new Set<Listener>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.profile = { ...DEFAULT_PROFILE, ...parsed };
      }
    } catch {
      this.profile = { ...DEFAULT_PROFILE };
    }
    this.emit();
  }

  getSnapshot = (): PlannerProfile => {
    return this.profile;
  };

  update(partial: Partial<PlannerProfile>) {
    this.profile = { ...this.profile, ...partial };
    this.persist();
    this.emit();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (!this.hydrated) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private persist() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const plannerStore = new PlannerProfileStore();
