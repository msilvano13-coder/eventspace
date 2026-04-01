"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { notificationStore, type ClientNotification } from "@/lib/notification-store";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const notifications = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getSnapshot
  );
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    notificationStore.hydrate();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = notificationStore.getUnreadCount();

  function handleClick(notification: ClientNotification) {
    notificationStore.markAsRead(notification.id);
    const eventId = notification.metadata?.eventId as string;
    if (eventId) {
      router.push(`/planner/${eventId}`);
    }
    setOpen(false);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-900">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={() => notificationStore.markAllAsRead()}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-400">
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 ${
                      !n.read ? "bg-rose-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-xs text-stone-400 mt-1">{formatTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
