# Phase 4: Performance + Scale — Handoff

## Context

EventSpace handles events up to ~500 objects reliably. Phase 4 hardens the platform for larger events (600+ guests, 1000+ layout objects) by fixing silent data truncation, race conditions, and O(n) bottlenecks in hot paths.

## Current State

| System | Status | Risk |
|--------|--------|------|
| Undo/redo | Command-pattern (Phase 1) | Hybrid — legacy snapshot fallback still exists for room shape + layout templates |
| Sub-entity fetchers | `.limit(500)` hard-coded | 600-person wedding silently drops 100 guests |
| Replace operations | Upsert → delete (non-atomic) | Data loss on crash between upsert and delete |
| Client portal RPC | `get_client_event` — 14 subqueries, no limits | Slow for large events, loads everything at once |
| Collision detection | O(n) per frame with nested `.find()` lookups | Degrades with 200+ objects |
| Layout object upsert | No chunking, no SQL IN clause limit | >1000 objects may fail |
| 3D settings save | Targeted `updateFloorPlanSettings()` | Fixed — no longer triggers full replaceFloorPlans |
| Tablescape save | RPC `replace_tablescape_items` | Fixed — includes user_id, debounced |

## Phase 4 Tasks

### 4a: Fix Silent Truncation (Paginated Fetchers)

**Problem:** Every sub-entity fetcher has `.limit(500)` with no pagination or warning. A 600-person wedding loads 500 guests and silently drops 100.

**All truncation points in `src/lib/supabase/db.ts`:**

| Line | Function | Table | Limit |
|------|----------|-------|-------|
| 1268 | `fetchEventGuests()` | guests | 500 |
| 1300 | `fetchEventTimeline()` | timeline_items | 500 |
| 1312 | `fetchEventSchedule()` | schedule_items | 500 |
| 1323 | `fetchEventVendors()` | vendors | 500 |
| 1334 | `fetchEventInvoices()` | invoices | 500 |
| 1345 | `fetchEventExpenses()` | expenses | 500 |
| 1356 | `fetchEventBudget()` | budget_items | 500 |
| 1367 | `fetchEventContracts()` | event_contracts | 500 |
| 1378 | `fetchEventFiles()` | shared_files | 500 |
| 1389 | `fetchEventMoodBoard()` | mood_board_images | 500 |
| 1401 | `fetchEventMessages()` | messages | 500 |
| 1412 | `fetchEventQuestionnaireAssignments()` | questionnaire_assignments | 500 |
| 1423 | `fetchEventDiscoveredVendors()` | discovered_vendors | 500 |
| 1435 | `fetchEventTablescapes()` | tablescapes | 100 |
| 2837 | `fetchContractAuditLog()` | contract_audit_log | 500 |

**Fix options:**
1. **Raise limits** to 2000+ (simplest, handles 99% of cases)
2. **Paginated fetch loop** — fetch in batches until `data.length < limit`, concat results
3. **Count-first approach** — query count, warn user if truncated, paginate on demand

**Recommendation:** Option 2 (paginated loop) with a safety cap at 5000. Add a `fetchAll()` helper:
```typescript
async function fetchAll<T>(query: PostgrestFilterBuilder, pageSize = 500, maxRows = 5000): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  while (offset < maxRows) {
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    results.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return results;
}
```

### 4b: Non-Atomic Replace Fix

**Problem:** Replace operations do upsert → delete in separate statements. If the process crashes between them, data is inconsistent.

**Affected functions in `db.ts`:**
- `replaceGuests()` (line 1540)
- `replaceGuestRelationships()` (line 1630)
- `replaceTimeline()` (line 1675)
- `replaceSchedule()` (line 1708)
- `replaceFloorPlans()` (line 1740) — also handles lighting zones
- `replaceVendors()`, `replaceExpenses()`, `replaceBudget()`, etc.

**Fix:** Wrap each replace function in a Supabase RPC (SECURITY DEFINER + single transaction). Pattern:

```sql
CREATE OR REPLACE FUNCTION replace_guests(
  p_event_id UUID,
  p_user_id UUID,
  p_guests JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Atomic: delete removed + upsert new in one transaction
  DELETE FROM guests WHERE event_id = p_event_id
    AND id NOT IN (SELECT (item->>'id')::UUID FROM jsonb_array_elements(p_guests) AS item);

  INSERT INTO guests (id, event_id, user_id, ...)
    SELECT ... FROM jsonb_array_elements(p_guests) AS item
    ON CONFLICT (id) DO UPDATE SET ...;
END;
$$;
```

**Priority:** High for guests (most likely to have >500 rows), medium for others.

### 4c: Client Portal RPC Optimization

**Problem:** `get_client_event` (in `supabase/client-portal-migration.sql`, line 20) executes 14 subqueries in one function call, aggregating everything via `jsonb_agg(row_to_json(...))`. For large events this is slow and returns a massive payload.

**Current structure:**
```sql
SELECT jsonb_build_object(
  'guests', (SELECT jsonb_agg(...) FROM guests WHERE event_id = v_event_id),
  'timeline', (SELECT jsonb_agg(...) FROM timeline_items WHERE ...),
  'schedule', (SELECT jsonb_agg(...) FROM schedule_items WHERE ...),
  -- ... 11 more subqueries
);
```

**Fix:** Split into lazy-loaded chunks matching the client portal's tab-based UI:
1. `get_client_event_core` — event fields + floor plans only (always needed)
2. `get_client_event_guests` — guests + relationships (loaded when guest tab opens)
3. `get_client_event_timeline` — timeline + schedule (loaded when timeline tab opens)
4. `get_client_event_vendors` — vendors + invoices + expenses (loaded when vendor tab opens)
5. `get_client_event_files` — files + mood board (loaded when files tab opens)

**Client-side:** Mirror the `ensureSubEntity()` pattern already used in the planner store.

### 4d: O(n²) Hot Path Fixes

**Collision Detection (`src/lib/floorplan/collision-detection.ts`):**

Lines 153, 159, 170: `canvas.getObjects().find()` called inside `forEach` loop over colliding IDs. Each `.find()` is O(n) scan through all canvas objects.

```typescript
// CURRENT (O(n²)):
collidingIds.forEach(id => {
  const obj = canvas.getObjects().find(o => o.data?._objectId === id);  // O(n) per ID
  // ...
});

// FIX: Build ID → object map once per frame
const objectMap = new Map<string, FabricObject>();
for (const obj of canvas.getObjects()) {
  if (obj.data?._objectId) objectMap.set(obj.data._objectId, obj);
}
collidingIds.forEach(id => {
  const obj = objectMap.get(id);  // O(1) per ID
  // ...
});
```

**FloorPlanEditor.tsx line 1281-1287:** `allObjs.includes(o)` in filter — O(n) per call, inside loop = O(n²). Convert to Set-based lookup.

**Alignment Engine (`src/lib/floorplan/alignment-engine.ts`):**
- `findAlignments()` is O(n × 9) which is effectively O(n) — acceptable for 200 objects
- `buildBoundsCache()` is O(n) — fine
- No spatial index needed until 500+ objects on canvas

### 4e: Layout Object Chunking

**Problem:** `replaceLayoutObjects()` in `src/lib/floorplan/layout-objects.ts` (lines 90-159) upserts all objects in one batch. SQL `IN` clause with >1000 IDs can fail on some Postgres configurations.

**Fix:** Chunk upserts into batches of 500:
```typescript
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  await supabase.from("layout_objects").upsert(chunk, { onConflict: "id" });
}
```

Same for the delete query's `NOT IN (...)` clause.

## Architecture Notes

### Store Pattern

All data flows through `src/lib/store.ts` → `EventStore` class:
- `update(id, partial)` separates event fields from sub-entities
- Sub-entities route through `SUB_ENTITY_REPLACERS` map to their `replace*()` function
- Optimistic update → DB write → rollback on failure
- `ensureSubEntity()` provides lazy loading per tab

### Save Path Optimization (Already Done)

Two targeted save functions bypass the full replace pattern:
- `updateFloorPlanSettings(planId, settings)` — only writes `view3d_settings` column
- `replace_tablescape_items` RPC — atomic item replacement with SECURITY DEFINER

These patterns should be replicated for other high-frequency update operations.

### RLS Denormalization

`phase2.5-rls-denormalization.sql` added `user_id NOT NULL` to:
- `layout_objects`
- `layout_versions`
- `tablescape_items`

Any new insert operations on these tables MUST include `user_id`. The `tablescapeItemToRow()` function was updated to accept `userId` parameter — verify similar functions include it.

## File Map

| File | Lines | Phase 4 Changes |
|------|-------|-----------------|
| `src/lib/supabase/db.ts` | ~2850 | Fix all `.limit(500)`, add paginated fetch helper, add atomic RPC functions |
| `src/lib/store.ts` | 392 | Wire new lazy-load RPCs for client portal |
| `src/lib/floorplan/layout-objects.ts` | 159 | Add chunked upsert/delete |
| `src/lib/floorplan/collision-detection.ts` | 177 | Replace `.find()` loops with Map-based lookup |
| `src/lib/floorplan/alignment-engine.ts` | 220 | No changes needed (O(n) is acceptable) |
| `src/components/floorplan/FloorPlanEditor.tsx` | ~2300 | Fix `includes()` O(n²), convert to Set |
| `supabase/client-portal-migration.sql` | ~150 | Split `get_client_event` into chunk RPCs |
| `supabase/*.sql` | new | Atomic replace RPCs for guests, timeline, etc. |

## Exit Criteria

- [ ] No `.limit()` truncation — all fetchers use paginated loop with 5000 cap
- [ ] No non-atomic replaces — critical entities (guests, floor plans) use transactional RPCs
- [ ] No O(n²) in hot paths — collision/alignment use Map-based lookups
- [ ] Client portal RPC under 200ms for events with 500+ objects
- [ ] Layout objects chunked at 500 per batch
- [ ] All insert operations include `user_id` where required by RLS denormalization

## Priority Order

1. **4a (paginated fetchers)** — highest risk, silent data loss in production
2. **4b (non-atomic replace)** — data integrity, affects all users
3. **4d (O(n²) fixes)** — quick wins, improves editor responsiveness
4. **4e (layout chunking)** — prevents failures at scale
5. **4c (RPC optimization)** — performance improvement, lower urgency
