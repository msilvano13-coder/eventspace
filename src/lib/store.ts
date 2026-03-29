"use client";

import { Event } from "./types";
import {
  getUserId, fetchEvents, fetchEventCore, createEvent as dbCreateEvent,
  updateEventFields, deleteEvent as dbDeleteEvent,
  replaceTimeline, replaceSchedule, replaceFloorPlans, replaceVendors,
  replaceGuests, replaceQuestionnaireAssignments, replaceInvoices,
  replaceExpenses, replaceBudget, replaceContracts, replaceFiles,
  replaceMoodBoard, replaceMessages, replaceDiscoveredVendors,
  fetchEventGuests, fetchEventTimeline, fetchEventSchedule,
  fetchEventVendors, fetchEventInvoices, fetchEventExpenses,
  fetchEventBudget, fetchEventContracts, fetchEventFiles,
  fetchEventMoodBoard, fetchEventMessages, fetchEventQuestionnaireAssignments,
  fetchEventDiscoveredVendors,
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

// Map sub-entity keys to their lazy fetcher
const SUB_ENTITY_FETCHERS: Record<string, (eventId: string) => Promise<any>> = {
  guests: fetchEventGuests,
  timeline: fetchEventTimeline,
  schedule: fetchEventSchedule,
  vendors: fetchEventVendors,
  invoices: fetchEventInvoices,
  expenses: fetchEventExpenses,
  budget: fetchEventBudget,
  contracts: fetchEventContracts,
  files: fetchEventFiles,
  moodBoard: fetchEventMoodBoard,
  messages: fetchEventMessages,
  questionnaires: fetchEventQuestionnaireAssignments,
  discoveredVendors: fetchEventDiscoveredVendors,
};

class EventStore {
  private events: Map<string, Event> = new Map();
  private listeners: Set<Listener> = new Set();
  private hydrated = false;
  private hydrating = false;
  private _loading = true;
  private cachedAll: Event[] = EMPTY;
  private coreLoaded: Set<string> = new Set();
  private loadingCore: Set<string> = new Set();
  // Track which sub-entities have been loaded per event
  private loadedEntities: Map<string, Set<string>> = new Map();
  private loadingEntities: Map<string, Set<string>> = new Map();

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

  /** Load event core data (event fields + floor plans). Replaces the old 14-way fetchEventFull. */
  getById(id: string): Event | undefined {
    const evt = this.events.get(id);
    if (evt && !this.coreLoaded.has(id) && !this.loadingCore.has(id)) {
      this.loadingCore.add(id);
      fetchEventCore(id)
        .then((full) => {
          if (full) {
            this.events.set(id, { ...evt, ...full });
            this.rebuildCache();
            this.coreLoaded.add(id);
            this.emit();
          }
        })
        .catch((err) => console.error("[EventStore] core load failed:", err))
        .finally(() => this.loadingCore.delete(id));
    }
    return evt;
  }

  /**
   * Lazy-load a sub-entity for an event. Only fetches from DB once per entity type per event.
   * Call from tab pages: store.ensureSubEntity(eventId, "guests")
   */
  ensureSubEntity(eventId: string, key: string): void {
    const loaded = this.loadedEntities.get(eventId);
    if (loaded?.has(key)) return;

    let loading = this.loadingEntities.get(eventId);
    if (loading?.has(key)) return;

    const fetcher = SUB_ENTITY_FETCHERS[key];
    if (!fetcher) return;

    if (!loading) {
      loading = new Set();
      this.loadingEntities.set(eventId, loading);
    }
    loading.add(key);

    fetcher(eventId)
      .then((data) => {
        const evt = this.events.get(eventId);
        if (evt) {
          this.events.set(eventId, { ...evt, [key]: data });
          this.rebuildCache();

          let loadedSet = this.loadedEntities.get(eventId);
          if (!loadedSet) {
            loadedSet = new Set();
            this.loadedEntities.set(eventId, loadedSet);
          }
          loadedSet.add(key);

          this.emit();
        }
      })
      .catch((err) => console.error(`[EventStore] load ${key} failed:`, err))
      .finally(() => {
        const l = this.loadingEntities.get(eventId);
        if (l) l.delete(key);
      });
  }

  /** Invalidate a sub-entity so it re-fetches on next access */
  invalidateSubEntity(eventId: string, key: string): void {
    const loaded = this.loadedEntities.get(eventId);
    if (loaded) loaded.delete(key);
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
    }
  }

  async delete(id: string): Promise<void> {
    this.events.delete(id);
    this.loadedEntities.delete(id);
    this.loadingEntities.delete(id);
    this.coreLoaded.delete(id);
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
