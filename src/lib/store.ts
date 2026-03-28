"use client";

import { Event, DEFAULT_FLOOR_PLANS } from "./types";
import { v4 as uuid } from "uuid";
import { getSeedData } from "./seed-data";

type Listener = () => void;

const EMPTY: Event[] = [];

class EventStore {
  private events: Map<string, Event> = new Map();
  private listeners: Set<Listener> = new Set();
  private hydrated = false;
  private cachedAll: Event[] = EMPTY;

  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("eventspace-data");
    if (saved) {
      try {
        const entries: [string, Event][] = JSON.parse(saved);
        this.events = new Map(entries);
        // Migrate old events
        Array.from(this.events.values()).forEach((evt) => {
          if (!evt.floorPlans) {
            evt.floorPlans = DEFAULT_FLOOR_PLANS.map((fp) => ({ ...fp, json: null }));
          }
          if (!evt.timeline) evt.timeline = [];
          if (!evt.schedule) evt.schedule = [];
          if (!evt.files) evt.files = [];
          if (!evt.vendors) evt.vendors = [];
          // Migrate vendors to include payment fields
          evt.vendors.forEach((v: any) => {
            if (v.contractTotal === undefined) v.contractTotal = 0;
            if (!v.payments) v.payments = [];
          });
          if (!evt.questionnaires) evt.questionnaires = [];
          if (!evt.invoices) evt.invoices = [];
          if (!evt.expenses) evt.expenses = [];
          if (!evt.guests) evt.guests = [];
          if (!evt.colorPalette) evt.colorPalette = [];
          if (!evt.budget) evt.budget = [];
          // Remove deprecated spent field (now derived from vendor contracts)
          evt.budget.forEach((b: any) => { delete b.spent; });
          delete (evt as any).vendorContracts;
          delete (evt as any).comments;
          delete (evt as any).floorPlanThumbnail;
          if (!evt.messages) evt.messages = [];
        });
      } catch {
        this.events = this.seedMap();
      }
    } else {
      this.events = this.seedMap();
    }
    this.rebuildCache();
    this.listeners.forEach((l) => l());
  }

  private seedMap(): Map<string, Event> {
    const seed = getSeedData();
    return new Map(seed.map((e) => [e.id, e]));
  }

  private rebuildCache() {
    this.cachedAll = Array.from(this.events.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  getSnapshot(): Event[] {
    return this.cachedAll;
  }

  getServerSnapshot(): Event[] {
    return EMPTY;
  }

  getById(id: string): Event | undefined {
    return this.events.get(id);
  }

  create(data: Omit<Event, "id" | "createdAt" | "updatedAt">): Event {
    const event: Event = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.events.set(event.id, event);
    this.persist();
    return event;
  }

  update(id: string, partial: Partial<Event>): void {
    const existing = this.events.get(id);
    if (!existing) return;
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.events.set(id, updated);
    this.persist();
  }

  delete(id: string): void {
    this.events.delete(id);
    this.persist();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist() {
    if (typeof window === "undefined") return;
    this.rebuildCache();
    localStorage.setItem(
      "eventspace-data",
      JSON.stringify(Array.from(this.events.entries()))
    );
    this.listeners.forEach((l) => l());
  }
}

export const store = new EventStore();
