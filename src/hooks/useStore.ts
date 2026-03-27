"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";
import { store } from "@/lib/store";
import { questionnaireStore } from "@/lib/questionnaire-store";
import { Event, Questionnaire } from "@/lib/types";

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
