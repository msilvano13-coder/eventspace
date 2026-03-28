"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";
import { store } from "@/lib/store";
import { questionnaireStore } from "@/lib/questionnaire-store";
import { plannerStore } from "@/lib/planner-store";
import { inquiryStore } from "@/lib/inquiry-store";
import { preferredVendorStore } from "@/lib/preferred-vendor-store";
import { Event, Questionnaire, PlannerProfile, Inquiry, PreferredVendor } from "@/lib/types";

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
};

export function usePlannerProfile(): PlannerProfile {
  return useSyncExternalStore(
    plannerSubscribeAndHydrate,
    () => plannerStore.getSnapshot(),
    () => defaultProfile
  );
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
