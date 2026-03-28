"use client";

import { Event } from "./types";
import {
  getUserId, fetchEvents, fetchEventFull, createEvent as dbCreateEvent,
  updateEventFields, deleteEvent as dbDeleteEvent,
  replaceTimeline, replaceSchedule, replaceFloorPlans, replaceVendors,
  replaceGuests, replaceQuestionnaireAssignments, replaceInvoices,
  replaceExpenses, replaceBudget, replaceContracts, replaceFiles,
  replaceMoodBoard, replaceMessages, replaceDiscoveredVendors
} from "@/lib/supabase/db";

type Listener = () => void;

const EMPTY: Event[] = [];

const SUB_ENTITY_KEYS = new Set<string>([
  "timeline", "schedule", "floorPlans", "vendors", "guests",
  "questionnaires", "invoices", "expenses", "budget", "contracts",
  "files", "moodBoard", "messages", "discoveredVendors",
]);

const SUB_ENTITY_REPLACERS: Record<string, (eventId: string, data: any) => Promise<void>> = {
  timeline: replaceTimeline,
  schedule: replaceSchedule,
  floorPlans: replaceFloorPlans,
  vendors: replaceVendors,
  guests: replaceGuests,
  questionnaires: replaceQuestionnaireAssignments,
  invoices: replaceInvoices,
  expenses: replaceExpenses,
  budget: replaceBudget,
  contracts: replaceContracts,
  files: replaceFiles,
  moodBoard: replaceMoodBoard,
  messages: replaceMessages,
  discoveredVendors: replaceDiscoveredVendors,
};

class EventStore {
  private events: Map<string, Event> = new Map();
  private listeners: Set<Listener> = new Set();
  private hydrated = false;
  private hydrating = false;
  private _loading = true;
  private cachedAll: Event[] = EMPTY;
  private fullyLoaded: Set<string> = new Set();
  private loadingFull: Set<string> = new Set();

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
      const rows = await fetchEvents();
      this.events = new Map(rows.map((e: Event) => [e.id, e]));
    } catch (err) {
      console.error("[EventStore] hydrate failed:", err);
      this.events = new Map();
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.rebuildCache();
    this.emit();
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
    const evt = this.events.get(id);
    if (evt && !this.fullyLoaded.has(id) && !this.loadingFull.has(id)) {
      this.loadingFull.add(id);
      fetchEventFull(id)
        .then((full) => {
          if (full) {
            this.events.set(id, full);
            this.rebuildCache();
            this.fullyLoaded.add(id);
            this.emit();
          }
        })
        .catch((err) => console.error("[EventStore] lazy load failed:", err))
        .finally(() => this.loadingFull.delete(id));
    }
    return evt;
  }

  async create(data: Omit<Event, "id" | "createdAt" | "updatedAt">): Promise<Event> {
    const userId = await getUserId();
    const event = await dbCreateEvent(data, userId);
    this.events.set(event.id, event);
    this.rebuildCache();
    this.emit();
    return event;
  }

  async update(id: string, partial: Partial<Event>): Promise<void> {
    const existing = this.events.get(id);
    if (!existing) return;

    // Optimistic local update
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.events.set(id, updated);
    this.rebuildCache();
    this.emit();

    // Separate event-level fields from sub-entity fields
    const eventFields: Record<string, any> = {};
    const subEntityUpdates: [string, any][] = [];

    for (const [key, value] of Object.entries(partial)) {
      if (SUB_ENTITY_KEYS.has(key)) {
        subEntityUpdates.push([key, value]);
      } else {
        eventFields[key] = value;
      }
    }

    try {
      // Update event-level fields
      if (Object.keys(eventFields).length > 0) {
        await updateEventFields(id, eventFields);
      }

      // Update sub-entities in parallel
      await Promise.all(
        subEntityUpdates.map(([key, value]) => {
          const replacer = SUB_ENTITY_REPLACERS[key];
          if (replacer) return replacer(id, value);
          return Promise.resolve();
        })
      );
    } catch (err) {
      console.error("[EventStore] update failed:", err);
      // Optimistic update stays in cache
    }
  }

  async delete(id: string): Promise<void> {
    this.events.delete(id);
    this.rebuildCache();
    this.emit();
    try {
      await dbDeleteEvent(id);
    } catch (err) {
      console.error("[EventStore] delete failed:", err);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const store = new EventStore();
