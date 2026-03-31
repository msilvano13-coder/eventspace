"use client";

import { Event } from "./types";
import {
  getUserId, fetchEvents, fetchEventCore,
  createEvent as dbCreateEvent,
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

const MAX_CACHED_EVENTS = 100;

class EventStore {
  private events: Map<string, Event> = new Map();
  // O(1) LRU tracking using a Map (insertion order = access order, re-insert to touch)
  private accessOrder: Map<string, true> = new Map();
  private listeners: Set<Listener> = new Set();
  private hydrated = false;
  private hydrating = false;
  private _loading = true;
  private _hasMore = false;
  private cachedAll: Event[] = EMPTY;
  private cacheDirty = true;
  private coreLoaded: Set<string> = new Set();
  private loadingCore: Set<string> = new Set();
  // Track which sub-entities have been loaded per event
  private loadedEntities: Map<string, Set<string>> = new Map();
  private loadingEntities: Map<string, Set<string>> = new Map();

  get isLoading(): boolean {
    return this._loading;
  }

  get hasMoreEvents(): boolean {
    return this._hasMore;
  }

  /** Move id to end of access order (most recent) — O(1) via Map re-insert */
  private touchLRU(id: string): void {
    this.accessOrder.delete(id);
    this.accessOrder.set(id, true);
  }

  /** Evict least recently used events if over max */
  private evictLRU(): void {
    while (this.events.size > MAX_CACHED_EVENTS && this.accessOrder.size > 0) {
      const evictId = this.accessOrder.keys().next().value!;
      this.accessOrder.delete(evictId);
      this.events.delete(evictId);
      this.loadedEntities.delete(evictId);
      this.loadingEntities.delete(evictId);
      this.coreLoaded.delete(evictId);
    }
  }

  async hydrate(): Promise<void> {
    if (this.hydrated || this.hydrating) return;
    this.hydrating = true;
    if (typeof window === "undefined") {
      this.hydrating = false;
      return;
    }
    try {
      const { data: rows, hasMore } = await fetchEvents();
      this.events = new Map(rows.map((e: Event) => [e.id, e]));
      this.accessOrder = new Map(rows.map((e: Event) => [e.id, true as const]));
      this._hasMore = hasMore;
    } catch (err) {
      console.error("[EventStore] hydrate failed:", err);
      this.events = new Map();
      this.accessOrder = new Map();
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.rebuildCache();
    this.emit();
  }

  /** Load more events (pagination) */
  async loadMore(): Promise<void> {
    if (!this._hasMore) return;
    try {
      const { data: rows, hasMore } = await fetchEvents(this.events.size);
      for (const e of rows) {
        this.events.set(e.id, e);
        this.touchLRU(e.id);
      }
      this._hasMore = hasMore;
      this.evictLRU();
      this.rebuildCache();
      this.emit();
    } catch (err) {
      console.error("[EventStore] loadMore failed:", err);
    }
  }

  private rebuildCache() {
    this.cacheDirty = true;
  }

  private ensureCache() {
    if (!this.cacheDirty) return;
    this.cachedAll = Array.from(this.events.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    this.cacheDirty = false;
  }

  getSnapshot(): Event[] {
    this.ensureCache();
    return this.cachedAll;
  }

  getServerSnapshot(): Event[] {
    return EMPTY;
  }

  /** Load event core data (event fields + floor plans). Replaces the old 14-way fetchEventFull. */
  getById(id: string): Event | undefined {
    const evt = this.events.get(id);
    if (evt) this.touchLRU(id);
    if (evt && !this.coreLoaded.has(id) && !this.loadingCore.has(id)) {
      this.loadingCore.add(id);
      fetchEventCore(id)
        .then((full) => {
          if (full) {
            // Use current event state (not stale capture) to preserve any optimistic updates
            const current = this.events.get(id) || evt;
            // Merge core fields + floor plans (which are fetched as part of core).
            // Skip other sub-entity keys so we don't overwrite data loaded by ensureSubEntity.
            const CORE_SUB_ENTITIES = new Set(["floorPlans"]);
            const coreFields: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(full)) {
              if (!SUB_ENTITY_KEYS.has(k) || CORE_SUB_ENTITIES.has(k)) {
                coreFields[k] = v;
              }
            }
            this.events.set(id, { ...current, ...coreFields } as Event);
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
        // If the event isn't in the store yet (hydration still in-flight),
        // wait up to 5s for it to appear before giving up.
        const apply = () => {
          const evt = this.events.get(eventId);
          if (evt) {
            this.events.set(eventId, { ...evt, [key]: data, updatedAt: new Date().toISOString() });
            this.rebuildCache();

            let loadedSet = this.loadedEntities.get(eventId);
            if (!loadedSet) {
              loadedSet = new Set();
              this.loadedEntities.set(eventId, loadedSet);
            }
            loadedSet.add(key);

            this.emit();
            return true;
          }
          return false;
        };

        if (!apply()) {
          // Event not ready — retry with exponential backoff (max 3 retries)
          const retry = (attempt: number) => {
            if (attempt >= 3) return; // give up after 3 retries
            const delay = 500 * Math.pow(2, attempt); // 500ms, 1000ms, 2000ms
            setTimeout(() => {
              if (!apply()) retry(attempt + 1);
            }, delay);
          };
          retry(0);
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
    this.touchLRU(event.id);
    this.evictLRU();
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
      console.error("[EventStore] update failed, rolling back:", err);
      // Rollback: restore previous state
      this.events.set(id, existing);
      this.rebuildCache();
      this.emit();
      throw err; // Re-throw so the UI can show an error toast
    }
  }

  async delete(id: string): Promise<void> {
    // Snapshot for rollback
    const snapshot = this.events.get(id);

    // Optimistic delete
    this.events.delete(id);
    this.loadedEntities.delete(id);
    this.loadingEntities.delete(id);
    this.coreLoaded.delete(id);
    this.accessOrder.delete(id);
    this.rebuildCache();
    this.emit();

    try {
      await dbDeleteEvent(id);
    } catch (err) {
      console.error("[EventStore] delete failed, rolling back:", err);
      // Rollback: restore the event so it reappears in the UI
      if (snapshot) {
        this.events.set(id, snapshot);
        this.touchLRU(id);
        this.rebuildCache();
        this.emit();
      }
      throw err; // Re-throw so the UI can show an error toast
    }
  }

  isCoreLoaded(id: string): boolean {
    return this.coreLoaded.has(id);
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
