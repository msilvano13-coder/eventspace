"use client";

import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, X, Download, GripVertical } from "lucide-react";
import { ScheduleItem } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function fmt12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function TimelinePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["schedule"]);
  const { updateEvent } = useStoreActions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // ── Drag state ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [touchDragId, setTouchDragId] = useState<string | null>(null);
  const touchStartY = useRef<number>(0);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const newTitleRef = useRef<HTMLInputElement>(null);
  const editTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) newTitleRef.current?.focus(); }, [adding]);
  useEffect(() => { if (editingId) editTitleRef.current?.focus(); }, [editingId]);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const sorted = [...(event.schedule ?? [])].sort((a, b) => a.time.localeCompare(b.time));

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const items = [...sorted];
    const fromIdx = items.findIndex((i) => i.id === fromId);
    const toIdx = items.findIndex((i) => i.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Remove the dragged item and insert at the new position
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);

    // Reassign times from the original sorted order to preserve chronological spacing
    const originalTimes = sorted.map((s) => s.time);
    const updated = items.map((item, idx) => ({ ...item, time: originalTimes[idx] }));
    updateEvent(event!.id, { schedule: updated });
  }

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id); setEditTime(item.time); setEditTitle(item.title); setEditNotes(item.notes);
  }

  function saveEdit() {
    if (!editingId || !editTitle.trim() || !editTime) { cancelEdit(); return; }
    const updated = (event!.schedule ?? []).map((s) =>
      s.id === editingId ? { ...s, time: editTime, title: editTitle.trim(), notes: editNotes } : s
    );
    updateEvent(event!.id, { schedule: updated });
    cancelEdit();
  }

  function cancelEdit() {
    setEditingId(null); setEditTime(""); setEditTitle(""); setEditNotes("");
  }

  function deleteItem(id: string) {
    updateEvent(event!.id, { schedule: (event!.schedule ?? []).filter((s) => s.id !== id) });
    if (editingId === id) cancelEdit();
  }

  function saveNew() {
    if (!newTitle.trim() || !newTime) return;
    const item: ScheduleItem = { id: crypto.randomUUID(), time: newTime, title: newTitle.trim(), notes: newNotes };
    updateEvent(event!.id, { schedule: [...(event!.schedule ?? []), item] });
    setNewTime(""); setNewTitle(""); setNewNotes("");
    newTitleRef.current?.focus();
  }

  function cancelNew() {
    setAdding(false); setNewTime(""); setNewTitle(""); setNewNotes("");
  }

  function exportTimeline() {
    const lines: string[] = [
      `${event!.name} — Wedding Day Timeline`,
      `${new Date(event!.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
      `Venue: ${event!.venue}`,
      "",
      "─────────────────────────────",
      "",
    ];
    sorted.forEach((item) => {
      lines.push(`${fmt12(item.time)}   ${item.title}`);
      if (item.notes) lines.push(`             ${item.notes}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event!.name.replace(/\s+/g, "_")}_Timeline.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Touch drag handlers ──
  function handleTouchStart(id: string, e: React.TouchEvent) {
    if (editingId) return;
    touchStartY.current = e.touches[0].clientY;
    setTouchDragId(id);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchDragId) return;
    const y = e.touches[0].clientY;
    // Find which item we're hovering over
    for (const [id, el] of Array.from(itemRefs.current.entries())) {
      if (id === touchDragId) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setDragOverId(id);
        return;
      }
    }
    setDragOverId(null);
  }

  function handleTouchEnd() {
    if (touchDragId && dragOverId) {
      reorder(touchDragId, dragOverId);
    }
    setTouchDragId(null);
    setDragOverId(null);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link
          href={`/planner/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-semibold text-stone-800 text-sm sm:text-base truncate">{event.name}</h1>
          <p className="text-xs text-stone-400">Day Timeline</p>
        </div>
        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <button
              onClick={exportTimeline}
              className="flex items-center gap-1.5 text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 px-3 py-2 rounded-xl transition-colors"
            >
              <Download size={13} />
              Export
            </button>
          )}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-medium bg-rose-400 hover:bg-rose-500 text-white px-3 py-2 rounded-xl transition-colors"
            >
              <Plus size={13} />
              Add moment
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {sorted.length > 1 && !editingId && (
          <p className="text-[11px] text-stone-400 mb-4 text-center">Drag the <GripVertical size={11} className="inline -mt-0.5" /> handle to reorder</p>
        )}

        {sorted.length === 0 && !adding ? (
          <div className="text-center py-16">
            <p className="text-stone-400 text-sm mb-3">No schedule yet.</p>
            <button onClick={() => setAdding(true)} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
              + Add the first moment
            </button>
          </div>
        ) : (
          <div className="relative">
            {sorted.length > 0 && (
              <div className="absolute left-[106px] top-3 bottom-3 w-px bg-stone-200" />
            )}
            <div className="space-y-1">
              {sorted.map((item, idx) =>
                editingId === item.id ? (
                  <div key={item.id} className="flex gap-4 py-3">
                    <div className="w-5 shrink-0" />
                    <div className="w-20 shrink-0" />
                    <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-soft p-4 space-y-3">
                      <div className="flex gap-3 items-center">
                        <input
                          type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                          className="text-sm border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-rose-300 bg-stone-50 font-medium text-stone-700"
                        />
                        <input
                          ref={editTitleRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                          placeholder="Activity"
                          className="flex-1 text-sm font-medium text-stone-800 bg-transparent outline-none placeholder:text-stone-400 placeholder:font-normal"
                        />
                      </div>
                      <input
                        value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full text-sm text-stone-500 bg-transparent outline-none placeholder:text-stone-400"
                      />
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={saveEdit} className="text-xs font-medium bg-rose-400 text-white px-4 py-1.5 rounded-lg hover:bg-rose-500 transition-colors">Save</button>
                        <button onClick={cancelEdit} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    ref={(el) => { if (el) itemRefs.current.set(item.id, el); else itemRefs.current.delete(item.id); }}
                    className={`group flex gap-4 py-3 transition-all ${
                      dragId === item.id || touchDragId === item.id ? "opacity-50" : ""
                    } ${
                      dragOverId === item.id ? "border-t-2 border-rose-400" : ""
                    }`}
                    draggable={!editingId}
                    onDragStart={(e) => {
                      setDragId(item.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragId && dragId !== item.id) setDragOverId(item.id);
                    }}
                    onDragLeave={() => { if (dragOverId === item.id) setDragOverId(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) reorder(dragId, item.id);
                      setDragId(null);
                      setDragOverId(null);
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      className="shrink-0 flex items-start pt-1 cursor-grab active:cursor-grabbing touch-none"
                      onTouchStart={(e) => handleTouchStart(item.id, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <GripVertical size={16} className="text-stone-300 hover:text-stone-400 transition-colors" />
                    </div>

                    <div className="w-20 shrink-0 text-right pt-0.5">
                      <span className="text-xs font-semibold text-stone-400 tracking-wide">{fmt12(item.time)}</span>
                    </div>
                    <div className="relative shrink-0 flex items-start justify-center" style={{ width: 0 }}>
                      <div className={`w-3 h-3 rounded-full border-2 border-stone-50 z-10 mt-1 -ml-1.5 transition-colors ${
                        idx === 0 ? "bg-rose-400 shadow-sm shadow-rose-200" : "bg-stone-300 group-hover:bg-stone-400"
                      }`} />
                    </div>
                    <div className="flex-1 pb-2 min-w-0 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 leading-snug">{item.title}</p>
                        {item.notes && <p className="text-xs text-stone-400 mt-1 leading-relaxed">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => startEdit(item)} className="p-1.5 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(item.id)} className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {adding && (
                <div className="flex gap-4 py-3">
                  <div className="w-5 shrink-0" />
                  <div className="w-20 shrink-0" />
                  <div className="flex-1 bg-white rounded-2xl border border-rose-200 shadow-soft p-4 space-y-3">
                    <div className="flex gap-3 items-center">
                      <input
                        type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                        className="text-sm border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-rose-300 bg-stone-50 font-medium text-stone-700"
                      />
                      <input
                        ref={newTitleRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") cancelNew(); }}
                        placeholder="Activity…"
                        className="flex-1 text-sm font-medium text-stone-800 bg-transparent outline-none placeholder:text-stone-400 placeholder:font-normal"
                      />
                    </div>
                    <input
                      value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full text-sm text-stone-500 bg-transparent outline-none placeholder:text-stone-400"
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={saveNew} className="text-xs font-medium bg-rose-400 text-white px-4 py-1.5 rounded-lg hover:bg-rose-500 transition-colors">Add</button>
                      <button onClick={cancelNew} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"><X size={14} /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Timeline Item?"
        message="This item will be removed from the day-of timeline."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) deleteItem(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
