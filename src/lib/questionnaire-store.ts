"use client";

import { Questionnaire } from "./types";
import { v4 as uuid } from "uuid";

type Listener = () => void;

const EMPTY: Questionnaire[] = [];

class QuestionnaireStore {
  private items: Map<string, Questionnaire> = new Map();
  private listeners: Set<Listener> = new Set();
  private hydrated = false;
  private cachedAll: Questionnaire[] = EMPTY;

  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("eventspace-questionnaires");
    if (saved) {
      try {
        const entries: [string, Questionnaire][] = JSON.parse(saved);
        this.items = new Map(entries);
      } catch {
        this.items = new Map();
      }
    }
    this.rebuildCache();
    this.listeners.forEach((l) => l());
  }

  private rebuildCache() {
    this.cachedAll = Array.from(this.items.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getSnapshot(): Questionnaire[] {
    return this.cachedAll;
  }

  getServerSnapshot(): Questionnaire[] {
    return EMPTY;
  }

  getById(id: string): Questionnaire | undefined {
    return this.items.get(id);
  }

  create(data: Omit<Questionnaire, "id" | "createdAt" | "updatedAt">): Questionnaire {
    const q: Questionnaire = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.items.set(q.id, q);
    this.persist();
    return q;
  }

  update(id: string, partial: Partial<Questionnaire>): void {
    const existing = this.items.get(id);
    if (!existing) return;
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    this.persist();
  }

  delete(id: string): void {
    this.items.delete(id);
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
      "eventspace-questionnaires",
      JSON.stringify(Array.from(this.items.entries()))
    );
    this.listeners.forEach((l) => l());
  }
}

export const questionnaireStore = new QuestionnaireStore();
