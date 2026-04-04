"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useEventCoreLoaded, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tablescape, TableShape, createDefaultTablescapes } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { useIsTeamMember } from "@/hooks/useIsTeamMember";

const TablescapeEditor = dynamic(
  () => import("@/components/tablescape/TablescapeEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-stone-100">
        <p className="text-stone-400 text-sm">Loading tablescape editor...</p>
      </div>
    ),
  }
);

export default function TablescapePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  const coreLoaded = useEventCoreLoaded(eventId);
  useEventSubEntities(eventId, ["tablescapes"]);
  const { updateEvent } = useStoreActions();
  const readOnly = useIsTeamMember();
  const [activeTablescapeId, setActiveTablescapeId] = useState<string | null>(null);
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const autoCreatedRef = useRef(false);
  const tablescapesRef = useRef<Tablescape[]>([]);
  const resolvedIdRef = useRef<string | null>(null);

  const tablescapes = event?.tablescapes ?? [];
  const resolvedId = activeTablescapeId ?? tablescapes[0]?.id ?? null;

  tablescapesRef.current = tablescapes;
  resolvedIdRef.current = resolvedId;

  // Auto-create default tablescapes if none exist
  useEffect(() => {
    if (autoCreatedRef.current || !event || !coreLoaded) return;
    if (tablescapes.length === 0) {
      autoCreatedRef.current = true;
      updateEvent(eventId, { tablescapes: createDefaultTablescapes() });
    }
  }, [event, eventId, updateEvent, tablescapes.length, coreLoaded]);

  const savePendingRef = useRef<Tablescape | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(
    (updated: Tablescape) => {
      const current = tablescapesRef.current;
      const currentId = resolvedIdRef.current;
      if (!currentId || current.length === 0) return;

      // Immediately update the local ref so the editor stays in sync
      const updatedList = current.map((t) =>
        t.id === currentId ? updated : t
      );
      tablescapesRef.current = updatedList;
      savePendingRef.current = updated;

      // Debounce the actual DB save to avoid hammering replaceTablescapes
      // on every item placement/move (which causes statement timeouts)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const pending = savePendingRef.current;
        if (!pending) return;
        savePendingRef.current = null;
        const latest = tablescapesRef.current;
        const latestList = latest.map((t) =>
          t.id === currentId ? pending : t
        );
        updateEvent(eventId, { tablescapes: latestList });
      }, 800);
    },
    [eventId, updateEvent]
  );

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Event not found.</p>
      </div>
    );
  }

  const activeTablescape = tablescapes.find((t) => t.id === resolvedId) || tablescapes[0];

  function handleUpdateTableSettings(field: string, value: TableShape | number) {
    if (!activeTablescape || readOnly) return;
    const updated = tablescapes.map((t) =>
      t.id === activeTablescape.id ? { ...t, [field]: value } : t
    );
    updateEvent(eventId, { tablescapes: updated });
  }

  function addTab() {
    if (!newTabName.trim()) return;
    const newTs: Tablescape = {
      id: uuid(),
      name: newTabName.trim(),
      tableShape: "round",
      tableWidth: 60,
      tableDepth: 60,
      items: [],
    };
    updateEvent(eventId, { tablescapes: [...tablescapes, newTs] });
    setActiveTablescapeId(newTs.id);
    setNewTabName("");
    setShowAddTab(false);
  }

  function deleteTab(id: string) {
    if (tablescapes.length <= 1) return;
    if (!confirm("Delete this tablescape? This cannot be undone.")) return;
    const remaining = tablescapes.filter((t) => t.id !== id);
    updateEvent(eventId, { tablescapes: remaining });
    if (resolvedId === id) {
      setActiveTablescapeId(remaining[0]?.id ?? null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      {/* Top bar */}
      <div className="h-11 md:h-12 bg-white border-b border-stone-200 flex items-center px-4 gap-3 flex-shrink-0">
        <Link
          href={`/planner/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <h2 className="text-sm font-medium text-stone-800 truncate hidden sm:block">
          {event.name} — Tablescape
        </h2>
        <div className="flex-1" />

        {/* Table shape selector */}
        {activeTablescape && !readOnly && (
          <div className="flex items-center gap-2">
            <select
              value={activeTablescape.tableShape}
              onChange={(e) => handleUpdateTableSettings("tableShape", e.target.value as TableShape)}
              className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:border-teal-400"
            >
              <option value="round">Round Table</option>
              <option value="rectangular">Rectangular Table</option>
              <option value="square">Square Table</option>
            </select>
            <input
              type="number"
              value={activeTablescape.tableWidth}
              onChange={(e) => handleUpdateTableSettings("tableWidth", parseInt(e.target.value) || 60)}
              className="w-16 text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:border-teal-400 text-center"
              title="Width (inches)"
            />
            <span className="text-[10px] text-stone-400">&times;</span>
            <input
              type="number"
              value={activeTablescape.tableDepth}
              onChange={(e) => handleUpdateTableSettings("tableDepth", parseInt(e.target.value) || 60)}
              className="w-16 text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:border-teal-400 text-center"
              title="Depth (inches)"
            />
            <span className="text-[10px] text-stone-400">in</span>
          </div>
        )}

        <span className="text-xs text-stone-400 hidden sm:inline">Auto-saved</span>
      </div>

      {/* Tablescape tabs */}
      <div className="bg-white border-b border-stone-200 flex items-center px-2 sm:px-4 overflow-x-auto flex-shrink-0">
        {tablescapes.map((ts) => (
          <div key={ts.id} className="relative group flex items-center">
            <button
              onClick={() => setActiveTablescapeId(ts.id)}
              className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                ts.id === activeTablescape?.id
                  ? "border-teal-400 text-teal-600"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              {ts.name}
              {ts.items.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-full font-semibold">
                  {ts.items.length}
                </span>
              )}
            </button>
            {!readOnly && tablescapes.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteTab(ts.id); }}
                className="opacity-0 group-hover:opacity-100 -ml-2 mr-1 p-0.5 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete tablescape"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (showAddTab ? (
          <div className="flex items-center gap-1 px-2">
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTab()}
              placeholder="Name..."
              autoFocus
              className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 w-28 outline-none focus:border-teal-400"
            />
            <button onClick={addTab} className="text-teal-500 text-xs font-medium">
              Add
            </button>
            <button
              onClick={() => setShowAddTab(false)}
              className="text-stone-400 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTab(true)}
            className="flex items-center gap-1 px-3 py-2.5 text-xs text-stone-400 hover:text-teal-500"
          >
            <Plus size={12} />
            <span className="hidden sm:inline">Add</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {activeTablescape ? (
          <TablescapeEditor
            tablescape={activeTablescape}
            onUpdate={handleSave}
            readOnly={readOnly}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-stone-400">No tablescape selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
