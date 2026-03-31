"use client";

import { Inquiry } from "./types";
import {
  getUserId,
  fetchInquiries,
  createInquiry as dbCreateInquiry,
  updateInquiry as dbUpdateInquiry,
  deleteInquiry as dbDeleteInquiry,
} from "@/lib/supabase/db";

type Listener = () => void;

const MAX_INQUIRIES = 1000;

class InquiryStore {
  private items: Inquiry[] = [];
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
      const rows = await fetchInquiries();
      this.items = rows.slice(0, MAX_INQUIRIES);
    } catch (err) {
      console.error("[InquiryStore] hydrate failed:", err);
      this.items = [];
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.emit();
  }

  private static EMPTY: Inquiry[] = [];
  getSnapshot = (): Inquiry[] => this.items;
  getServerSnapshot = (): Inquiry[] => InquiryStore.EMPTY;

  getById(id: string): Inquiry | undefined {
    return this.items.find((i) => i.id === id);
  }

  async create(data: Omit<Inquiry, "id" | "createdAt" | "updatedAt">): Promise<Inquiry> {
    const userId = await getUserId();
    const inquiry = await dbCreateInquiry(data, userId);
    this.items = [inquiry, ...this.items].slice(0, MAX_INQUIRIES);
    this.emit();
    return inquiry;
  }

  async update(id: string, partial: Partial<Inquiry>): Promise<void> {
    this.items = this.items.map((i) =>
      i.id === id ? { ...i, ...partial, updatedAt: new Date().toISOString() } : i
    );
    this.emit();
    try {
      await dbUpdateInquiry(id, partial);
    } catch (err) {
      console.error("[InquiryStore] update failed:", err);
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
    this.emit();
    try {
      await dbDeleteInquiry(id);
    } catch (err) {
      console.error("[InquiryStore] delete failed:", err);
    }
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

export const inquiryStore = new InquiryStore();
