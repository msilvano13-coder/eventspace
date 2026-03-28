import { Inquiry } from "./types";

type Listener = () => void;

const STORAGE_KEY = "eventspace-inquiries";

class InquiryStore {
  private items: Inquiry[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.items = JSON.parse(raw);
    } catch {
      this.items = [];
    }
  }

  private static EMPTY: Inquiry[] = [];
  getSnapshot = (): Inquiry[] => this.items;
  getServerSnapshot = (): Inquiry[] => InquiryStore.EMPTY;

  getById(id: string): Inquiry | undefined {
    return this.items.find((i) => i.id === id);
  }

  create(data: Omit<Inquiry, "id" | "createdAt" | "updatedAt">): Inquiry {
    const now = new Date().toISOString();
    const inquiry: Inquiry = {
      ...data,
      id: "inq-" + crypto.randomUUID().slice(0, 8),
      createdAt: now,
      updatedAt: now,
    };
    this.items = [inquiry, ...this.items];
    this.persist();
    this.emit();
    return inquiry;
  }

  update(id: string, partial: Partial<Inquiry>) {
    this.items = this.items.map((i) =>
      i.id === id ? { ...i, ...partial, updatedAt: new Date().toISOString() } : i
    );
    this.persist();
    this.emit();
  }

  delete(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
    this.persist();
    this.emit();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (!this.hydrated) this.hydrate();
    return () => this.listeners.delete(listener);
  };

  private persist() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const inquiryStore = new InquiryStore();
