import { Guest, GuestRelationship } from "./types";

// ── Types ──

export interface TableSlot {
  label: string;
  maxSeats: number;
}

export interface SeatingResult {
  assignments: Map<string, string>; // guestId → tableLabel
  unassigned: string[];             // guestIds that couldn't be placed
  score: number;                    // higher = better (for comparing solutions)
}

// ── Algorithm ──

/**
 * Smart seating algorithm that assigns accepted guests to tables while
 * respecting capacity, groups, relationships, dietary clustering, and VIP priority.
 *
 * Strategy (greedy, constraint-based):
 * 1. Build guest "units" — each guest + their plus-one is one unit (takes 1 or 2 seats)
 * 2. Cluster units into groups (explicit group field, then dietary, then ungrouped)
 * 3. Sort groups: VIP-heavy groups first, then largest groups first
 * 4. For each group, find the best-fit table (most remaining capacity that still fits)
 * 5. Apply keep-together constraints (boost) and keep-apart penalties
 * 6. Spill oversized groups across multiple tables, keeping sub-clusters together
 */
export function autoSeat(
  guests: Guest[],
  tables: TableSlot[],
  relationships: GuestRelationship[] = []
): SeatingResult {
  const accepted = guests.filter((g) => g.rsvp === "accepted");
  if (accepted.length === 0 || tables.length === 0) {
    return { assignments: new Map(), unassigned: [], score: 0 };
  }

  // Build keep-together and keep-apart maps
  const keepTogether = new Map<string, Set<string>>();
  const keepApart = new Map<string, Set<string>>();
  for (const rel of relationships) {
    const map = rel.type === "together" ? keepTogether : keepApart;
    if (!map.has(rel.guestId1)) map.set(rel.guestId1, new Set());
    if (!map.has(rel.guestId2)) map.set(rel.guestId2, new Set());
    map.get(rel.guestId1)!.add(rel.guestId2);
    map.get(rel.guestId2)!.add(rel.guestId1);
  }

  // Build guest units (guest + optional plus-one = 1 or 2 seats)
  interface GuestUnit {
    guestId: string;
    seats: number; // 1 or 2
    group: string;
    vip: boolean;
    dietary: string;
  }

  const units: GuestUnit[] = accepted.map((g) => ({
    guestId: g.id,
    seats: 1 + (g.plusOne ? 1 : 0),
    group: g.group.trim(),
    vip: g.vip,
    dietary: g.dietaryNotes.trim().toLowerCase(),
  }));

  // Merge keep-together relationships into synthetic groups
  // If two guests have a "together" relationship and different groups, unify them
  const groupOverrides = new Map<string, string>();
  for (const rel of relationships.filter((r) => r.type === "together")) {
    const u1 = units.find((u) => u.guestId === rel.guestId1);
    const u2 = units.find((u) => u.guestId === rel.guestId2);
    if (u1 && u2) {
      // Use the non-empty group, or create a synthetic one
      const targetGroup = u1.group || u2.group || `__together_${rel.guestId1}`;
      groupOverrides.set(u1.guestId, targetGroup);
      groupOverrides.set(u2.guestId, targetGroup);
    }
  }
  for (const unit of units) {
    if (groupOverrides.has(unit.guestId)) {
      unit.group = groupOverrides.get(unit.guestId)!;
    }
  }

  // Cluster units by group
  const groupMap = new Map<string, GuestUnit[]>();
  let ungroupedIdx = 0;
  for (const unit of units) {
    const key = unit.group || `__ungrouped_${ungroupedIdx++}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(unit);
  }

  // Sort groups: VIP-heavy first, then by size (largest first)
  const sortedGroups = Array.from(groupMap.entries()).sort(([, a], [, b]) => {
    const vipA = a.filter((u) => u.vip).length / a.length;
    const vipB = b.filter((u) => u.vip).length / b.length;
    if (vipA !== vipB) return vipB - vipA;
    return totalSeats(b) - totalSeats(a);
  });

  // Track remaining capacity per table
  const remaining = new Map<string, number>();
  for (const t of tables) {
    remaining.set(t.label, t.maxSeats);
  }

  const assignments = new Map<string, string>();
  const unassigned: string[] = [];

  // Assign each group
  for (const [, groupUnits] of sortedGroups) {
    const needed = totalSeats(groupUnits);

    // Find best table for the whole group
    const bestTable = findBestTable(groupUnits, remaining, keepApart, assignments);

    if (bestTable && remaining.get(bestTable)! >= needed) {
      // Whole group fits in one table
      for (const unit of groupUnits) {
        assignments.set(unit.guestId, bestTable);
        remaining.set(bestTable, remaining.get(bestTable)! - unit.seats);
      }
    } else {
      // Need to split across tables — sort units by VIP desc, then assign greedily
      const sorted = [...groupUnits].sort((a, b) => {
        if (a.vip !== b.vip) return b.vip ? 1 : -1;
        return b.seats - a.seats;
      });

      for (const unit of sorted) {
        const table = findBestTable([unit], remaining, keepApart, assignments);
        if (table && remaining.get(table)! >= unit.seats) {
          assignments.set(unit.guestId, table);
          remaining.set(table, remaining.get(table)! - unit.seats);
        } else {
          unassigned.push(unit.guestId);
        }
      }
    }
  }

  // Score: +10 per seated guest, +5 bonus for group cohesion, -20 for keep-apart violations
  let score = assignments.size * 10;
  // Group cohesion bonus
  for (const [, groupUnits] of sortedGroups) {
    const tableSet = new Set<string>();
    for (const unit of groupUnits) {
      const t = assignments.get(unit.guestId);
      if (t) tableSet.add(t);
    }
    if (tableSet.size === 1 && groupUnits.length > 1) {
      score += groupUnits.length * 5;
    }
  }
  // Keep-apart penalty
  for (const rel of relationships.filter((r) => r.type === "apart")) {
    const t1 = assignments.get(rel.guestId1);
    const t2 = assignments.get(rel.guestId2);
    if (t1 && t2 && t1 === t2) {
      score -= 20;
    }
  }

  return { assignments, unassigned, score };
}

// ── Helpers ──

interface SeatUnit { seats: number; guestId: string }

function totalSeats(units: SeatUnit[]): number {
  return units.reduce((sum, u) => sum + u.seats, 0);
}

/**
 * Find the best table for a set of units, considering:
 * - Must have enough capacity
 * - Prefer tables that already have group-mates (cohesion)
 * - Avoid tables with keep-apart guests
 * - Prefer tighter fit (less wasted space)
 */
function findBestTable(
  units: { guestId: string; seats: number }[],
  remaining: Map<string, number>,
  keepApart: Map<string, Set<string>>,
  assignments: Map<string, string>
): string | null {
  const needed = totalSeats(units);
  const guestIdList = units.map((u) => u.guestId);

  let bestTable: string | null = null;
  let bestScore = -Infinity;

  remaining.forEach((capacity, label) => {
    if (capacity < needed) return;

    let tableScore = 0;

    // Prefer tighter fit (less remaining space after seating)
    tableScore += (10 - (capacity - needed));

    // Check keep-apart constraints
    let hasConflict = false;
    assignments.forEach((existingTable, existingGuestId) => {
      if (existingTable !== label) return;
      guestIdList.forEach((gId) => {
        if (keepApart.get(gId)?.has(existingGuestId)) {
          hasConflict = true;
          tableScore -= 50;
        }
      });
    });

    // Prefer tables without conflicts
    if (!hasConflict && tableScore > bestScore) {
      bestScore = tableScore;
      bestTable = label;
    } else if (tableScore > bestScore) {
      bestScore = tableScore;
      bestTable = label;
    }
  });

  return bestTable;
}
