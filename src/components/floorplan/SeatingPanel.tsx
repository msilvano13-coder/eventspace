"use client";

import { useState } from "react";
import { Guest, GuestRelationship } from "@/lib/types";
import { Users, UserPlus, X, ChevronDown, ChevronUp, Sparkles, Star, RotateCcw } from "lucide-react";
import { FURNITURE_CATALOG } from "@/lib/constants";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";
import { autoSeat, TableSlot } from "@/lib/seating-algorithm";

interface TableInfo {
  /** Stable unique ID persisted on canvas object — used as seating key */
  tableId: string;
  /** Human-readable display name */
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

/** Parse floor plan JSON to extract table objects with stable unique IDs.
 *  Recurses into nested Fabric.js Groups to find table sub-objects within table sets.
 *  For table-set groups (isTableSet), uses the group's tableId and counts chairs for maxSeats.
 */
function extractTables(json: string | null): TableInfo[] {
  if (!json) return [];
  try {
    const canvas = unwrapCanvasJSON(json);
    const objects = (canvas as Record<string, unknown>).objects as any[] || [];
    const tables: TableInfo[] = [];
    let fallbackIdx = 0;

    const processObject = (obj: any) => {
      const data = obj.data;
      if (!data || data.isGrid || data.isRoom) return;

      // Table-set groups (e.g., Round 60" + 8 Chairs) — count chairs for accurate maxSeats
      if (data.isTableSet && data.tableId) {
        const chairCount = countChairs(obj);
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        tables.push({
          tableId: data.tableId,
          label: data.label || catalogItem?.name || "Table",
          furnitureId: data.furnitureId,
          maxSeats: chairCount > 0 ? chairCount : (catalogItem?.maxSeats ?? 0),
        });
        return; // Don't recurse further — the group is the table unit
      }

      // Individual table objects (not in a group)
      if (data.furnitureId) {
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        if (catalogItem && catalogItem.category === "table") {
          const posKey = `${Math.round(obj.left ?? 0)}_${Math.round(obj.top ?? 0)}`;
          const tableId = data.tableId || `__legacy_${data.furnitureId}_${posKey}_${fallbackIdx++}`;
          tables.push({
            tableId,
            label: data.label || catalogItem.name,
            furnitureId: data.furnitureId,
            maxSeats: catalogItem.maxSeats ?? 0,
          });
          return;
        }
      }

      // Recurse into nested groups (e.g., ungrouped sub-groups)
      if (obj.objects && Array.isArray(obj.objects)) {
        for (const child of obj.objects) {
          processObject(child);
        }
      }
    };

    for (const obj of objects) {
      processObject(obj);
    }

    // Ensure unique display labels — append #N for duplicates
    const labelCounts = new Map<string, number>();
    for (const t of tables) {
      labelCounts.set(t.label, (labelCounts.get(t.label) ?? 0) + 1);
    }
    const labelIdx = new Map<string, number>();
    for (const t of tables) {
      if ((labelCounts.get(t.label) ?? 0) > 1) {
        const idx = (labelIdx.get(t.label) ?? 0) + 1;
        labelIdx.set(t.label, idx);
        t.label = `${t.label} #${idx}`;
      }
    }
    return tables;
  } catch (err) {
    console.error("[SeatingPanel] extractTables failed:", err);
    return [];
  }
}

/** Count chairs inside a table-set group (recursively) */
function countChairs(obj: any): number {
  let count = 0;
  if (obj.objects && Array.isArray(obj.objects)) {
    for (const child of obj.objects) {
      if (child.data?.furnitureId === "chair") {
        count++;
      } else if (child.objects) {
        count += countChairs(child);
      }
    }
  }
  return count;
}

function isSweetheartTable(t: TableInfo): boolean {
  return t.furnitureId.includes("sweetheart") || t.label.toLowerCase().includes("sweetheart");
}

export default function SeatingPanel({ floorPlanJSON, guests, onUpdateGuests, relationships: relsProp }: Props) {
  const tables = extractTables(floorPlanJSON);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showAutoSeatConfirm, setShowAutoSeatConfirm] = useState(false);
  const [lastAutoResult, setLastAutoResult] = useState<{ seated: number; unassigned: number } | null>(null);

  const acceptedGuests = guests.filter((g) => g.rsvp === "accepted");
  const unassigned = acceptedGuests.filter(
    (g) => !g.tableAssignment || !tables.some((t) => t.tableId === g.tableAssignment)
  );

  // Compute unique groups for display
  const groups = Array.from(new Set(acceptedGuests.map((g) => g.group).filter(Boolean)));

  function assignGuest(guestId: string, tableId: string) {
    const updated = guests.map((g) =>
      g.id === guestId ? { ...g, tableAssignment: tableId } : g
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
      .filter((t) => t.maxSeats > 0 && !isSweetheartTable(t))
      .map((t) => {
        // Subtract already-occupied seats so algorithm knows remaining capacity
        const occupied = headCount(t.tableId);
        return { label: t.tableId, maxSeats: Math.max(0, t.maxSeats - occupied) };
      })
      .filter((t) => t.maxSeats > 0); // Only tables with remaining capacity

    if (seatableTables.length === 0) return;

    const relationships: GuestRelationship[] = relsProp ?? [];

    // Only pass unassigned guests to the algorithm
    const unassignedGuests = guests.filter((g) => {
      if (g.rsvp !== "accepted") return false;
      return !g.tableAssignment || !tables.some((t) => t.tableId === g.tableAssignment);
    });

    const result = autoSeat(unassignedGuests, seatableTables, relationships);

    // Apply assignments — algorithm returns tableId values (passed as label to TableSlot)
    const updated = guests.map((g) => {
      const tableId = result.assignments.get(g.id);
      return tableId ? { ...g, tableAssignment: tableId } : g;
    });

    onUpdateGuests(updated);
    setLastAutoResult({
      seated: result.assignments.size,
      unassigned: result.unassigned.length,
    });
    setShowAutoSeatConfirm(false);
  }

  function guestsAtTable(tableId: string) {
    return acceptedGuests.filter((g) => g.tableAssignment === tableId);
  }

  function headCount(tableId: string) {
    const seated = guestsAtTable(tableId);
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
  const assignedGuests = acceptedGuests.filter(
    (g) => g.tableAssignment && tables.some((t) => t.tableId === g.tableAssignment)
  );
  const totalSeated = assignedGuests.reduce((sum, g) => sum + 1 + (g.plusOne ? 1 : 0), 0);

  return (
    <div className="w-72 h-full bg-white border-l border-stone-200 flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-stone-100">
        <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
          Seating Chart
        </h3>
        <p className="text-[10px] text-stone-400 mt-1">
          {totalSeated}/{totalCapacity} seated · {unassigned.reduce((sum, g) => sum + 1 + (g.plusOne ? 1 : 0), 0)} unassigned
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
          const seated = guestsAtTable(table.tableId);
          const count = headCount(table.tableId);
          const isExpanded = expandedTable === table.tableId;
          const isSweetheart = isSweetheartTable(table);

          return (
            <div key={table.tableId}>
              <button
                onClick={() => setExpandedTable(isExpanded ? null : table.tableId)}
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
                      {isSweetheart ? (
                        <p className="text-[10px] text-amber-500 italic px-1">Sweetheart table — reserved for the couple</p>
                      ) : table.maxSeats > 0 && count >= table.maxSeats ? (
                        <p className="text-[10px] text-red-400 italic px-1">Table is at capacity ({count}/{table.maxSeats})</p>
                      ) : (
                        <>
                          <p className="text-[10px] text-stone-400 mb-1">
                            Add to this table{table.maxSeats > 0 ? ` (${table.maxSeats - count} seats left)` : ""}:
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {unassigned.map((guest) => {
                              const guestSeats = 1 + (guest.plusOne ? 1 : 0);
                              const wouldExceed = table.maxSeats > 0 && count + guestSeats > table.maxSeats;
                              return (
                                <button
                                  key={guest.id}
                                  onClick={() => !wouldExceed && assignGuest(guest.id, table.tableId)}
                                  disabled={wouldExceed}
                                  className={`w-full flex items-center gap-1.5 text-left rounded-lg px-2.5 py-1.5 transition-colors group ${
                                    wouldExceed
                                      ? "bg-stone-50 opacity-40 cursor-not-allowed"
                                      : "bg-stone-50 hover:bg-rose-50"
                                  }`}
                                  title={wouldExceed ? `Not enough seats (needs ${guestSeats}, ${table.maxSeats - count} left)` : undefined}
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
                              );
                            })}
                          </div>
                        </>
                      )}
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
