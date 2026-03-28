"use client";

import { ContractTemplate } from "./types";

type Listener = () => void;

const STORAGE_KEY = "eventspace-contract-templates";
const EMPTY: ContractTemplate[] = [];

class ContractTemplateStore {
  private templates: ContractTemplate[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.templates = JSON.parse(raw);
      }
    } catch {
      this.templates = [];
    }
  }

  getSnapshot = (): ContractTemplate[] => {
    return this.templates;
  };

  getServerSnapshot = (): ContractTemplate[] => {
    return EMPTY;
  };

  add(template: ContractTemplate) {
    this.templates = [...this.templates, template];
    this.persist();
    this.emit();
  }

  update(id: string, partial: Partial<ContractTemplate>) {
    this.templates = this.templates.map((t) =>
      t.id === id ? { ...t, ...partial, updatedAt: new Date().toISOString() } : t
    );
    this.persist();
    this.emit();
  }

  remove(id: string) {
    this.templates = this.templates.filter((t) => t.id !== id);
    this.persist();
    this.emit();
  }

  getById(id: string): ContractTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (!this.hydrated) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private persist() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.templates));
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const contractTemplateStore = new ContractTemplateStore();
