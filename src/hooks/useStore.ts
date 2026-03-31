"use client";

import { useSyncExternalStore, useCallback, useRef, useState, useEffect } from "react";
import { store, SUB_ENTITY_KEYS } from "@/lib/store";
import { questionnaireStore } from "@/lib/questionnaire-store";
import { plannerStore } from "@/lib/planner-store";
import { inquiryStore } from "@/lib/inquiry-store";
import { preferredVendorStore } from "@/lib/preferred-vendor-store";
import { contractTemplateStore } from "@/lib/contract-template-store";
import { Event, Questionnaire, PlannerProfile, Inquiry, PreferredVendor, ContractTemplate } from "@/lib/types";

// ── Loading hook ──
// Returns true while any store is still fetching from Supabase

export function useStoreLoading(): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = () => {
      const anyLoading =
        store.isLoading ||
        plannerStore.isLoading ||
        questionnaireStore.isLoading ||
        inquiryStore.isLoading ||
        preferredVendorStore.isLoading ||
        contractTemplateStore.isLoading;
      setLoading(anyLoading);
    };
    check();
    // Re-check whenever any store emits
    const unsubs = [
      store.subscribe(check),
      plannerStore.subscribe(check),
      questionnaireStore.subscribe(check),
      inquiryStore.subscribe(check),
      preferredVendorStore.subscribe(check),
      contractTemplateStore.subscribe(check),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  return loading;
}

export function useEventsLoading(): boolean {
  const [loading, setLoading] = useState(store.isLoading);
  useEffect(() => {
    const check = () => setLoading(store.isLoading);
    check();
    return store.subscribe(check);
  }, []);
  return loading;
}

function subscribeAndHydrate(cb: () => void) {
  store.hydrate();
  return store.subscribe(cb);
}

export function useEvents(): Event[] {
  return useSyncExternalStore(
    subscribeAndHydrate,
    () => store.getSnapshot(),
    () => store.getServerSnapshot()
  );
}

export function useEvent(id: string): Event | undefined {
  const prevRef = useRef<Event | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    const next = store.getById(id);
    if (
      prevRef.current &&
      next &&
      prevRef.current.updatedAt === next.updatedAt &&
      prevRef.current.id === next.id
    ) {
      return prevRef.current;
    }
    prevRef.current = next;
    return next;
  }, [id]);

  return useSyncExternalStore(
    subscribeAndHydrate,
    getSnapshot,
    () => undefined
  );
}

/**
 * Lazy-load a sub-entity for an event. Call from tab pages to avoid the 14-way join.
 * Example: useEventSubEntity(eventId, "guests") — only fetches guests for this event.
 * Accepts multiple keys to load several entities at once.
 */
export function useEventSubEntities(eventId: string, keys: string[]): void {
  // Protocol 5: validate keys at call site in development
  if (process.env.NODE_ENV === "development") {
    for (const key of keys) {
      if (!SUB_ENTITY_KEYS.has(key)) {
        throw new Error(
          `[useEventSubEntities] Invalid key "${key}". Valid keys: ${Array.from(SUB_ENTITY_KEYS).join(", ")}`
        );
      }
    }
  }

  useEffect(() => {
    if (!eventId) return;
    for (const key of keys) {
      store.ensureSubEntity(eventId, key);
    }
  }, [eventId, ...keys]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useEventCoreLoaded(eventId: string): boolean {
  const [loaded, setLoaded] = useState(() => store.isCoreLoaded(eventId));
  useEffect(() => {
    const check = () => setLoaded(store.isCoreLoaded(eventId));
    check();
    return store.subscribe(check);
  }, [eventId]);
  return loaded;
}

export function useStoreActions() {
  const createEvent = useCallback(
    (data: Omit<Event, "id" | "createdAt" | "updatedAt">) => store.create(data),
    []
  );
  const updateEvent = useCallback(
    (id: string, partial: Partial<Event>) => store.update(id, partial),
    []
  );
  const deleteEvent = useCallback((id: string) => store.delete(id), []);

  return { createEvent, updateEvent, deleteEvent };
}

// ── Questionnaire hooks ──

function qSubscribeAndHydrate(cb: () => void) {
  questionnaireStore.hydrate();
  return questionnaireStore.subscribe(cb);
}

export function useQuestionnaires(): Questionnaire[] {
  return useSyncExternalStore(
    qSubscribeAndHydrate,
    () => questionnaireStore.getSnapshot(),
    () => questionnaireStore.getServerSnapshot()
  );
}

export function useQuestionnaire(id: string): Questionnaire | undefined {
  const prevRef = useRef<Questionnaire | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    const next = questionnaireStore.getById(id);
    if (
      prevRef.current &&
      next &&
      prevRef.current.updatedAt === next.updatedAt &&
      prevRef.current.id === next.id
    ) {
      return prevRef.current;
    }
    prevRef.current = next;
    return next;
  }, [id]);

  return useSyncExternalStore(
    qSubscribeAndHydrate,
    getSnapshot,
    () => undefined
  );
}

export function useQuestionnaireActions() {
  const createQuestionnaire = useCallback(
    (data: Omit<Questionnaire, "id" | "createdAt" | "updatedAt">) => questionnaireStore.create(data),
    []
  );
  const updateQuestionnaire = useCallback(
    (id: string, partial: Partial<Questionnaire>) => questionnaireStore.update(id, partial),
    []
  );
  const deleteQuestionnaire = useCallback((id: string) => questionnaireStore.delete(id), []);

  return { createQuestionnaire, updateQuestionnaire, deleteQuestionnaire };
}

// ── Planner Profile hooks ──

function plannerSubscribeAndHydrate(cb: () => void) {
  plannerStore.hydrate();
  return plannerStore.subscribe(cb);
}

const defaultProfile: PlannerProfile = {
  businessName: "", plannerName: "", email: "", phone: "",
  website: "", logoUrl: "", brandColor: "#e88b8b", tagline: "",
  plan: "pending", trialEndsAt: null, stripeCustomerId: null,
  stripeSubscriptionId: null, stripePaymentId: null,
};

export function usePlannerProfile(): PlannerProfile {
  return useSyncExternalStore(
    plannerSubscribeAndHydrate,
    () => plannerStore.getSnapshot(),
    () => defaultProfile
  );
}

export function usePlannerProfileLoading(): boolean {
  const [loading, setLoading] = useState(plannerStore.isLoading);
  useEffect(() => {
    const check = () => setLoading(plannerStore.isLoading);
    check();
    return plannerStore.subscribe(check);
  }, []);
  return loading;
}

// ── Inquiry hooks ──

function inqSubscribeAndHydrate(cb: () => void) {
  inquiryStore.hydrate();
  return inquiryStore.subscribe(cb);
}

export function useInquiries(): Inquiry[] {
  return useSyncExternalStore(
    inqSubscribeAndHydrate,
    inquiryStore.getSnapshot,
    inquiryStore.getServerSnapshot
  );
}

export function useInquiryActions() {
  const createInquiry = useCallback(
    (data: Omit<Inquiry, "id" | "createdAt" | "updatedAt">) => inquiryStore.create(data),
    []
  );
  const updateInquiry = useCallback(
    (id: string, partial: Partial<Inquiry>) => inquiryStore.update(id, partial),
    []
  );
  const deleteInquiry = useCallback((id: string) => inquiryStore.delete(id), []);

  return { createInquiry, updateInquiry, deleteInquiry };
}

export function usePlannerProfileActions() {
  const updateProfile = useCallback(
    (partial: Partial<PlannerProfile>) => plannerStore.update(partial),
    []
  );
  return { updateProfile };
}

// ── Preferred Vendor hooks ──

function prefSubscribeAndHydrate(cb: () => void) {
  preferredVendorStore.hydrate();
  return preferredVendorStore.subscribe(cb);
}

export function usePreferredVendors(): PreferredVendor[] {
  return useSyncExternalStore(
    prefSubscribeAndHydrate,
    preferredVendorStore.getSnapshot,
    preferredVendorStore.getServerSnapshot
  );
}

export function usePreferredVendorActions() {
  const addPreferredVendor = useCallback(
    (vendor: PreferredVendor) => preferredVendorStore.add(vendor),
    []
  );
  const updatePreferredVendor = useCallback(
    (id: string, partial: Partial<PreferredVendor>) => preferredVendorStore.update(id, partial),
    []
  );
  const removePreferredVendor = useCallback(
    (id: string) => preferredVendorStore.remove(id),
    []
  );
  const isPreferred = useCallback(
    (name: string, phone: string) => preferredVendorStore.exists(name, phone),
    []
  );
  return { addPreferredVendor, updatePreferredVendor, removePreferredVendor, isPreferred };
}

// ── Contract Template hooks ──

function ctSubscribeAndHydrate(cb: () => void) {
  contractTemplateStore.hydrate();
  return contractTemplateStore.subscribe(cb);
}

export function useContractTemplates(): ContractTemplate[] {
  return useSyncExternalStore(
    ctSubscribeAndHydrate,
    contractTemplateStore.getSnapshot,
    contractTemplateStore.getServerSnapshot
  );
}

export function useContractTemplateActions() {
  const addTemplate = useCallback(
    (t: ContractTemplate) => contractTemplateStore.add(t),
    []
  );
  const updateTemplate = useCallback(
    (id: string, partial: Partial<ContractTemplate>) => contractTemplateStore.update(id, partial),
    []
  );
  const removeTemplate = useCallback(
    (id: string) => contractTemplateStore.remove(id),
    []
  );
  return { addTemplate, updateTemplate, removeTemplate };
}
