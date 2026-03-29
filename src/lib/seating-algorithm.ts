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

// ── Union-Find for transitive group merging ──

class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!)); // path compression
    }
    return this.parent.get(x)!;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }
}

// ── Algorithm ──

/**
 * Smart seating algorithm that assigns guests to tables while
 * respecting capacity, groups, relationships, dietary clustering, and VIP priority.
 *
 * Strategy (greedy, constraint-based):
 * 1. Build guest "units" — each guest + their plus-one is one unit (takes 1 or 2 seats)
 * 2. Transitively merge keep-together relationships via union-find
 * 3. Cluster units into groups (explicit group → keep-together → dietary → ungrouped)
 * 4. Sort groups: VIP-heavy groups first, then largest groups first
 * 5. For each group, find the best-fit table (tightest fit that still works)
 * 6. Apply keep-apart as hard constraints (skip conflicting tables)
 * 7. Spill oversized groups across multiple tables, keeping sub-clusters together
 *
 * Note: Callers should pre-filter guests (e.g., only unassigned, only accepted).
 * The algorithm seats ALL guests passed to it.
 */
export function autoSeat(
  guests: Guest[],
  tables: TableSlot[],
  relationships: GuestRelationship[] = []
): SeatingResult {
  if (guests.length === 0 || tables.length === 0) {
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

  const units: GuestUnit[] = guests.map((g) => ({
    guestId: g.id,
    seats: 1 + (g.plusOne ? 1 : 0),
    group: (g.group ?? "").trim(),
    vip: g.vip ?? false,
    dietary: (g.dietaryNotes ?? "").trim().toLowerCase(),
  }));

  // ── Transitive group merging via union-find ──
  // If A keep-together B, and B keep-together C, all three should be in one group
  const uf = new UnionFind();

  // First, union guests that share an explicit group name
  const groupMembers = new Map<string, string[]>();
  for (const unit of units) {
    if (unit.group) {
      if (!groupMembers.has(unit.group)) groupMembers.set(unit.group, []);
      groupMembers.get(unit.group)!.push(unit.guestId);
    }
  }
  groupMembers.forEach((members) => {
    for (let i = 1; i < members.length; i++) {
      uf.union(members[0], members[i]);
    }
  });

  // Then union keep-together relationships (transitively merges across groups)
  for (const rel of relationships.filter((r) => r.type === "together")) {
    const u1 = units.find((u) => u.guestId === rel.guestId1);
    const u2 = units.find((u) => u.guestId === rel.guestId2);
    if (u1 && u2) {
      uf.union(u1.guestId, u2.guestId);
    }
  }

  // Assign each unit to its union-find root as the group key
  for (const unit of units) {
    const root = uf.find(unit.guestId);
    // Use an explicit group name from any member if available
    const rootUnit = units.find((u) => u.guestId === root);
    const explicitGroup = rootUnit?.group || unit.group;
    unit.group = explicitGroup || `__uf_${root}`;
  }

  // ── Cluster ungrouped guests by dietary notes ──
  // Instead of giving each ungrouped guest a unique key, cluster by diet
  const groupMap = new Map<string, GuestUnit[]>();
  for (const unit of units) {
    let key = unit.group;
    // If still ungrouped (no explicit group, no keep-together), cluster by dietary
    if (key.startsWith("__uf_")) {
      // Check if this "group" has only one member (truly ungrouped)
      const existingMembers = groupMap.get(key);
      if (!existingMembers || existingMembers.length === 0) {
        // First member — check if we should cluster by diet instead
        if (unit.dietary) {
          key = `__diet_${unit.dietary}`;
        }
        // else stays as __uf_ key (solo ungrouped, no dietary)
      }
    }
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

  // Score: +10 per seated head (counting plus-ones), +5 bonus for group cohesion, -20 for keep-apart violations
  const unitMap = new Map(units.map((u) => [u.guestId, u]));
  let score = 0;
  assignments.forEach((_, guestId) => {
    score += (unitMap.get(guestId)?.seats ?? 1) * 10;
  });
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
 * - Avoid tables with keep-apart guests (hard constraint — skip entirely)
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

    // Prefer tighter fit — normalize to 0-10 range
    const tableScore = Math.max(0, 10 - (capacity - needed));

    // Check keep-apart constraints (hard constraint: skip table entirely)
    let hasConflict = false;
    assignments.forEach((existingTable, existingGuestId) => {
      if (existingTable !== label) return;
      guestIdList.forEach((gId) => {
        if (keepApart.get(gId)?.has(existingGuestId)) {
          hasConflict = true;
        }
      });
    });

    // Skip tables with keep-apart conflicts entirely
    if (hasConflict) return;

    if (tableScore > bestScore) {
      bestScore = tableScore;
      bestTable = label;
    }
  });

  return bestTable;
}
