"use client";

import { ContractTemplate } from "./types";
import {
  getUserId,
  fetchContractTemplates,
  createContractTemplate as dbCreateContractTemplate,
  updateContractTemplate as dbUpdateContractTemplate,
  deleteContractTemplate as dbDeleteContractTemplate,
} from "@/lib/supabase/db";

type Listener = () => void;

const EMPTY: ContractTemplate[] = [];

class ContractTemplateStore {
  private templates: ContractTemplate[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;
  private hydrating = false;
  private _loading = true;

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
      this.templates = await fetchContractTemplates();
    } catch (err) {
      console.error("[ContractTemplateStore] hydrate failed:", err);
      this.templates = [];
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.emit();
  }

  getSnapshot = (): ContractTemplate[] => {
    return this.templates;
  };

  getServerSnapshot = (): ContractTemplate[] => {
    return EMPTY;
  };

  async add(template: ContractTemplate): Promise<void> {
    this.templates = [...this.templates, template];
    this.emit();
    try {
      const userId = await getUserId();
      await dbCreateContractTemplate(template, userId);
    } catch (err) {
      console.error("[ContractTemplateStore] add failed:", err);
    }
  }

  async update(id: string, partial: Partial<ContractTemplate>): Promise<void> {
    this.templates = this.templates.map((t) =>
      t.id === id ? { ...t, ...partial, updatedAt: new Date().toISOString() } : t
    );
    this.emit();
    try {
      await dbUpdateContractTemplate(id, partial);
    } catch (err) {
      console.error("[ContractTemplateStore] update failed:", err);
    }
  }

  async remove(id: string): Promise<void> {
    this.templates = this.templates.filter((t) => t.id !== id);
    this.emit();
    try {
      await dbDeleteContractTemplate(id);
    } catch (err) {
      console.error("[ContractTemplateStore] remove failed:", err);
    }
  }

  getById(id: string): ContractTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (!this.hydrated && !this.hydrating) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const contractTemplateStore = new ContractTemplateStore();
