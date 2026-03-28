"use client";

import { useState } from "react";
import { Guest } from "@/lib/types";
import { Users, UserPlus, X, ChevronDown, ChevronUp } from "lucide-react";
import { FURNITURE_CATALOG } from "@/lib/constants";

interface TableInfo {
  label: string;
  furnitureId: string;
}

interface Props {
  floorPlanJSON: string | null;
  guests: Guest[];
  onUpdateGuests: (guests: Guest[]) => void;
}

/** Parse floor plan JSON to extract table objects */
function extractTables(json: string | null): TableInfo[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    const objects = parsed.objects || [];
    const tables: TableInfo[] = [];
    for (const obj of objects) {
      const data = obj.data;
      if (!data || data.isGrid || data.isRoom) continue;
      if (!data.furnitureId) continue;
      const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
      if (catalogItem && catalogItem.category === "table") {
        tables.push({ label: data.label || catalogItem.name, furnitureId: data.furnitureId });
      }
    }
    return tables;
  } catch {
    return [];
  }
}

export default function SeatingPanel({ floorPlanJSON, guests, onUpdateGuests }: Props) {
  const tables = extractTables(floorPlanJSON);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const acceptedGuests = guests.filter((g) => g.rsvp === "accepted");
  const unassigned = acceptedGuests.filter(
    (g) => !g.tableAssignment || !tables.some((t) => t.label === g.tableAssignment)
  );

  function assignGuest(guestId: string, tableLabel: string) {
    const updated = guests.map((g) =>
      g.id === guestId ? { ...g, tableAssignment: tableLabel } : g
    );
    onUpdateGuests(updated);
  }

  function unassignGuest(guestId: string) {
    const updated = guests.map((g) =>
      g.id === guestId ? { ...g, tableAssignment: "" } : g
    );
    onUpdateGuests(updated);
  }

  function guestsAtTable(tableLabel: string) {
    return acceptedGuests.filter((g) => g.tableAssignment === tableLabel);
  }

  function headCount(tableLabel: string) {
    const seated = guestsAtTable(tableLabel);
    return seated.reduce((sum, g) => sum + 1 + (g.plusOne ? 1 : 0), 0);
  }

  if (tables.length === 0) {
    return (
      <div className="w-72 h-full bg-white border-l border-stone-200 flex-shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-stone-100">
          <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
            Seating Chart
          </h3>
        </div>
        <div className="p-5 text-center">
          <Users size={20} className="text-stone-300 mx-auto mb-2" />
          <p className="text-xs text-stone-400">
            Add tables to your floor plan to start assigning seats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-white border-l border-stone-200 flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-stone-100">
        <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
          Seating Chart
        </h3>
        <p className="text-[10px] text-stone-400 mt-1">
          {acceptedGuests.length} accepted · {unassigned.length} unassigned
        </p>
      </div>

      {/* Tables */}
      <div className="divide-y divide-stone-100">
        {tables.map((table) => {
          const seated = guestsAtTable(table.label);
          const count = headCount(table.label);
          const isExpanded = expandedTable === table.label;

          return (
            <div key={table.label}>
              <button
                onClick={() => setExpandedTable(isExpanded ? null : table.label)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-stone-500">{count}</span>
                  </div>
                  <span className="text-xs font-medium text-stone-700 truncate">{table.label}</span>
                </div>
                {isExpanded ? <ChevronUp size={12} className="text-stone-400" /> : <ChevronDown size={12} className="text-stone-400" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-1.5">
                  {/* Seated guests */}
                  {seated.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between bg-emerald-50 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <span className="text-xs text-stone-700 truncate block">{guest.name}</span>
                        {guest.plusOne && (
                          <span className="text-[10px] text-stone-400">+1{guest.plusOneName ? `: ${guest.plusOneName}` : ""}</span>
                        )}
                      </div>
                      <button
                        onClick={() => unassignGuest(guest.id)}
                        className="text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                        title="Remove from table"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Assign from unassigned pool */}
                  {unassigned.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] text-stone-400 mb-1">Add to this table:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {unassigned.map((guest) => (
                          <button
                            key={guest.id}
                            onClick={() => assignGuest(guest.id, table.label)}
                            className="w-full flex items-center gap-1.5 text-left bg-stone-50 hover:bg-rose-50 rounded-lg px-2.5 py-1.5 transition-colors group"
                          >
                            <UserPlus size={10} className="text-stone-300 group-hover:text-rose-400 flex-shrink-0" />
                            <span className="text-xs text-stone-600 truncate">{guest.name}</span>
                            {guest.plusOne && <span className="text-[10px] text-stone-400 flex-shrink-0">+1</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {seated.length === 0 && unassigned.length === 0 && (
                    <p className="text-[10px] text-stone-400 italic px-1">No accepted guests to assign</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <div className="border-t border-stone-200 px-3 py-3">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">
            Unassigned ({unassigned.length})
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {unassigned.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-xs text-stone-600 truncate">{guest.name}</span>
                {guest.plusOne && <span className="text-[10px] text-stone-400 flex-shrink-0">+1</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
