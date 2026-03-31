"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import { subscribeErrorToast } from "@/lib/error-toast";

interface ToastItem {
  id: number;
  message: string;
}

let nextId = 0;

export default function ErrorToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return subscribeErrorToast((message) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, message }]); // keep max 5
      const timer = setTimeout(() => dismiss(id), 6000);
      timers.current.set(id, timer);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-5 text-sm"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
