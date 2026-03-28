"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { MessageCircle, Send } from "lucide-react";

interface Props {
  messages: Message[];
  senderRole: "planner" | "client";
  senderName: string;
  onSend: (messages: Message[]) => void;
}

export default function MessageThread({ messages, senderRole, senderName, onSend }: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      sender: senderRole,
      senderName,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    onSend([...messages, msg]);
    setText("");
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
        <MessageCircle size={15} className="text-blue-400" />
        <h2 className="font-heading font-semibold text-stone-800">Messages</h2>
        {messages.length > 0 && (
          <span className="text-xs text-stone-400 ml-auto">{messages.length}</span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-80 min-h-[120px]"
      >
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle size={20} className="text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No messages yet.</p>
            <p className="text-xs text-stone-300 mt-1">Start the conversation below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender === senderRole;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-medium text-stone-400">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] text-stone-300">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? "bg-rose-50 text-stone-700 rounded-br-md"
                      : "bg-stone-100 text-stone-700 rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-100 px-4 py-3 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Type a message…"
          className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-400 text-white hover:bg-rose-500 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
