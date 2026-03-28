"use client";

import { PreferredVendor } from "./types";

type Listener = () => void;

const STORAGE_KEY = "eventspace-preferred-vendors";
const EMPTY: PreferredVendor[] = [];

class PreferredVendorStore {
  private vendors: PreferredVendor[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.vendors = JSON.parse(raw);
      }
    } catch {
      this.vendors = [];
    }
  }

  getSnapshot = (): PreferredVendor[] => {
    return this.vendors;
  };

  getServerSnapshot = (): PreferredVendor[] => {
    return EMPTY;
  };

  add(vendor: PreferredVendor) {
    this.vendors = [...this.vendors, vendor];
    this.persist();
    this.emit();
  }

  update(id: string, partial: Partial<PreferredVendor>) {
    this.vendors = this.vendors.map((v) =>
      v.id === id ? { ...v, ...partial } : v
    );
    this.persist();
    this.emit();
  }

  remove(id: string) {
    this.vendors = this.vendors.filter((v) => v.id !== id);
    this.persist();
    this.emit();
  }

  getById(id: string): PreferredVendor | undefined {
    return this.vendors.find((v) => v.id === id);
  }

  exists(name: string, phone: string): boolean {
    return this.vendors.some(
      (v) => v.name.toLowerCase() === name.toLowerCase() && v.phone === phone
    );
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (!this.hydrated) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private persist() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.vendors));
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const preferredVendorStore = new PreferredVendorStore();
