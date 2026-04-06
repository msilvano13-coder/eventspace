"use client";

import { createClient } from "@/lib/supabase/client";
import { showErrorToast } from "./error-toast";

export interface ClientNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

type Listener = () => void;

class NotificationStore {
  private notifications: ClientNotification[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;
  private hydrating = false;

  async hydrate(): Promise<void> {
    if (this.hydrated || this.hydrating) return;
    this.hydrating = true;
    if (typeof window === "undefined") {
      this.hydrating = false;
      return;
    }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.notifications = (data ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata || {},
        read: n.read,
        createdAt: n.created_at,
      }));
    } catch {
      showErrorToast("Failed to load notifications");
    }
    this.hydrated = true;
    this.hydrating = false;
    this.emit();
  }

  getSnapshot = (): ClientNotification[] => {
    return this.notifications;
  };

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  async markAsRead(id: string): Promise<void> {
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      this.notifications = this.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      this.emit();
    } catch {
      showErrorToast("Failed to mark notification as read");
    }
  }

  async markAllAsRead(): Promise<void> {
    const supabase = createClient();
    const unreadIds = this.notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
      this.emit();
    } catch {
      showErrorToast("Failed to update notifications");
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const notificationStore = new NotificationStore();
