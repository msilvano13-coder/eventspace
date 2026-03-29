"use client";

import { useState } from "react";
import { Guest, GuestRelationship } from "@/lib/types";
import { Users, UserPlus, X, ChevronDown, ChevronUp, Sparkles, Star, RotateCcw } from "lucide-react";
import { FURNITURE_CATALOG } from "@/lib/constants";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";
import { autoSeat, TableSlot } from "@/lib/seating-algorithm";

interface TableInfo {
  label: string;
  furnitureId: string;
  maxSeats: number;
}

interface Props {
  floorPlanJSON: string | null;
  guests: Guest[];
  onUpdateGuests: (guests: Guest[]) => void;
  relationships?: GuestRelationship[];
}

/** Parse floor plan JSON to extract table objects */
function extractTables(json: string | null): TableInfo[] {
  if (!json) return [];
  try {
    const canvas = unwrapCanvasJSON(json);
    const objects = (canvas as Record<string, unknown>).objects as any[] || [];
    const tables: TableInfo[] = [];
    for (const obj of objects) {
      const data = obj.data;
      if (!data || data.isGrid || data.isRoom) continue;
      if (!data.furnitureId) continue;
      const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
      if (catalogItem && catalogItem.category === "table") {
        tables.push({ label: data.label || catalogItem.name, furnitureId: data.furnitureId, maxSeats: catalogItem.maxSeats ?? 0 });
      }
    }
    return tables;
  } catch {
    return [];
  }
}

export default function SeatingPanel({ floorPlanJSON, guests, onUpdateGuests, relationships: relsProp }: Props) {
  const tables = extractTables(floorPlanJSON);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showAutoSeatConfirm, setShowAutoSeatConfirm] = useState(false);
  const [lastAutoResult, setLastAutoResult] = useState<{ seated: number; unassigned: number } | null>(null);

  const acceptedGuests = guests.filter((g) => g.rsvp === "accepted");
  const unassigned = acceptedGuests.filter(
    (g) => !g.tableAssignment || !tables.some((t) => t.label === g.tableAssignment)
  );

  // Compute unique groups for display
  const groups = Array.from(new Set(acceptedGuests.map((g) => g.group).filter(Boolean)));

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

  function clearAllAssignments() {
    const updated = guests.map((g) => ({ ...g, tableAssignment: "" }));
    onUpdateGuests(updated);
    setLastAutoResult(null);
  }

  function runAutoSeat() {
    const seatableTables: TableSlot[] = tables
      .filter((t) => t.maxSeats > 0)
      .map((t) => ({ label: t.label, maxSeats: t.maxSeats }));

    if (seatableTables.length === 0) return;

    const relationships: GuestRelationship[] = relsProp ?? [];

    const result = autoSeat(guests, seatableTables, relationships);

    // Apply assignments
    const updated = guests.map((g) => {
      const table = result.assignments.get(g.id);
      return table ? { ...g, tableAssignment: table } : g;
    });

    onUpdateGuests(updated);
    setLastAutoResult({
      seated: result.assignments.size,
      unassigned: result.unassigned.length,
    });
    setShowAutoSeatConfirm(false);
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

  const totalCapacity = tables.reduce((sum, t) => sum + t.maxSeats, 0);
  const totalSeated = acceptedGuests.reduce((sum, g) => sum + 1 + (g.plusOne ? 1 : 0), 0);

  return (
    <div className="w-72 h-full bg-white border-l border-stone-200 flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-stone-100">
        <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
          Seating Chart
        </h3>
        <p className="text-[10px] text-stone-400 mt-1">
          {totalSeated}/{totalCapacity} seated · {unassigned.length} unassigned
        </p>

        {/* Auto-Seat + Clear buttons */}
        <div className="flex gap-1.5 mt-2">
          {!showAutoSeatConfirm ? (
            <button
              onClick={() => setShowAutoSeatConfirm(true)}
              disabled={unassigned.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium bg-gradient-to-r from-violet-500 to-purple-500 text-white px-2.5 py-1.5 rounded-lg hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Sparkles size={11} />
              Auto-Seat
            </button>
          ) : (
            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] text-stone-500">
                Auto-assign {unassigned.length} unassigned guest{unassigned.length !== 1 ? "s" : ""}? Groups, VIPs, and dietary notes will be considered.
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={runAutoSeat}
                  className="flex-1 text-[10px] font-medium bg-violet-500 text-white px-2 py-1 rounded-md hover:bg-violet-600 transition-colors"
                >
                  Assign
                </button>
                <button
                  onClick={() => setShowAutoSeatConfirm(false)}
                  className="text-[10px] text-stone-400 hover:text-stone-600 px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {acceptedGuests.some((g) => g.tableAssignment) && !showAutoSeatConfirm && (
            <button
              onClick={clearAllAssignments}
              className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Clear all seating"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>

        {/* Auto-seat result feedback */}
        {lastAutoResult && (
          <div className="mt-2 text-[10px] bg-violet-50 text-violet-600 rounded-md px-2 py-1.5">
            Seated {lastAutoResult.seated} guest{lastAutoResult.seated !== 1 ? "s" : ""}
            {lastAutoResult.unassigned > 0 && (
              <span className="text-amber-600"> · {lastAutoResult.unassigned} could not be placed</span>
            )}
          </div>
        )}

        {/* Groups summary */}
        {groups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {groups.map((g) => (
              <span key={g} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">
                {g}
              </span>
            ))}
          </div>
        )}
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    table.maxSeats > 0 && count > table.maxSeats
                      ? "bg-red-100"
                      : table.maxSeats > 0 && count === table.maxSeats
                        ? "bg-emerald-100"
                        : "bg-stone-100"
                  }`}>
                    <span className={`text-[10px] font-semibold ${
                      table.maxSeats > 0 && count > table.maxSeats
                        ? "text-red-600"
                        : table.maxSeats > 0 && count === table.maxSeats
                          ? "text-emerald-600"
                          : "text-stone-500"
                    }`}>{count}/{table.maxSeats}</span>
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
                      <div className="min-w-0 flex items-center gap-1">
                        {guest.vip && <Star size={9} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                        <span className="text-xs text-stone-700 truncate block">{guest.name}</span>
                        {guest.group && (
                          <span className="text-[8px] bg-stone-200 text-stone-500 px-1 py-0.5 rounded-full flex-shrink-0 max-w-[60px] truncate">
                            {guest.group}
                          </span>
                        )}
                        {guest.plusOne && (
                          <span className="text-[10px] text-stone-400 flex-shrink-0">+1</span>
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
                            {guest.vip && <Star size={8} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                            <span className="text-xs text-stone-600 truncate">{guest.name}</span>
                            {guest.group && (
                              <span className="text-[8px] bg-stone-100 text-stone-400 px-1 py-0.5 rounded-full flex-shrink-0">
                                {guest.group}
                              </span>
                            )}
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
                className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5"
              >
                {guest.vip && <Star size={8} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                <span className="text-xs text-stone-600 truncate">{guest.name}</span>
                {guest.group && (
                  <span className="text-[8px] bg-amber-100 text-amber-500 px-1 py-0.5 rounded-full flex-shrink-0">
                    {guest.group}
                  </span>
                )}
                {guest.plusOne && <span className="text-[10px] text-stone-400 flex-shrink-0">+1</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
