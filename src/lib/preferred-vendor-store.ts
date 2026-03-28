"use client";

import { PreferredVendor } from "./types";
import {
  getUserId,
  fetchPreferredVendors,
  createPreferredVendor as dbCreatePreferredVendor,
  updatePreferredVendor as dbUpdatePreferredVendor,
  deletePreferredVendor as dbDeletePreferredVendor,
} from "@/lib/supabase/db";

type Listener = () => void;

const EMPTY: PreferredVendor[] = [];

class PreferredVendorStore {
  private vendors: PreferredVendor[] = [];
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
      this.vendors = await fetchPreferredVendors();
    } catch (err) {
      console.error("[PreferredVendorStore] hydrate failed:", err);
      this.vendors = [];
    }
    this.hydrated = true;
    this.hydrating = false;
    this._loading = false;
    this.emit();
  }

  getSnapshot = (): PreferredVendor[] => {
    return this.vendors;
  };

  getServerSnapshot = (): PreferredVendor[] => {
    return EMPTY;
  };

  async add(vendor: PreferredVendor): Promise<void> {
    this.vendors = [...this.vendors, vendor];
    this.emit();
    try {
      const userId = await getUserId();
      await dbCreatePreferredVendor(vendor, userId);
    } catch (err) {
      console.error("[PreferredVendorStore] add failed:", err);
    }
  }

  async update(id: string, partial: Partial<PreferredVendor>): Promise<void> {
    this.vendors = this.vendors.map((v) =>
      v.id === id ? { ...v, ...partial } : v
    );
    this.emit();
    try {
      await dbUpdatePreferredVendor(id, partial);
    } catch (err) {
      console.error("[PreferredVendorStore] update failed:", err);
    }
  }

  async remove(id: string): Promise<void> {
    this.vendors = this.vendors.filter((v) => v.id !== id);
    this.emit();
    try {
      await dbDeletePreferredVendor(id);
    } catch (err) {
      console.error("[PreferredVendorStore] remove failed:", err);
    }
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
    if (!this.hydrated && !this.hydrating) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const preferredVendorStore = new PreferredVendorStore();
