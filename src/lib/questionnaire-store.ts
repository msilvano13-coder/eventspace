"use client";

import { Questionnaire } from "./types";
import {
  getUserId,
  fetchQuestionnaires,
  createQuestionnaire as dbCreateQuestionnaire,
  updateQuestionnaire as dbUpdateQuestionnaire,
  deleteQuestionnaire as dbDeleteQuestionnaire,
} from "@/lib/supabase/db";

type Listener = () => void;

const EMPTY: Questionnaire[] = [];

class QuestionnaireStore {
  private items: Map<string, Questionnaire> = new Map();
  private listeners: Set<Listener> = new Set();
  private hydrated = false;
  private hydrating = false;
  private _loading = true;
  private cachedAll: Questionnaire[] = EMPTY;

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
      const rows = await fetchQuestionnaires();
      this.items = new Map(rows.map((q: Questionnaire) => [q.id, q]));
    } catch (err) {
      console.error("[QuestionnaireStore] hydrate failed:", err);
      this.items = new Map();
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.rebuildCache();
    this.emit();
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

  async create(data: Omit<Questionnaire, "id" | "createdAt" | "updatedAt">): Promise<Questionnaire> {
    const userId = await getUserId();
    const q = await dbCreateQuestionnaire(data, userId);
    this.items.set(q.id, q);
    this.rebuildCache();
    this.emit();
    return q;
  }

  async update(id: string, partial: Partial<Questionnaire>): Promise<void> {
    const existing = this.items.get(id);
    if (!existing) return;
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    this.rebuildCache();
    this.emit();
    try {
      await dbUpdateQuestionnaire(id, partial);
    } catch (err) {
      console.error("[QuestionnaireStore] update failed:", err);
    }
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
    this.rebuildCache();
    this.emit();
    try {
      await dbDeleteQuestionnaire(id);
    } catch (err) {
      console.error("[QuestionnaireStore] delete failed:", err);
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

export const questionnaireStore = new QuestionnaireStore();
