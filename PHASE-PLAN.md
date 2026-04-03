# EventSpace — Phase Plan (Revised 2026-04-03)

## Completed Work

| Phase | Status | Key Deliverables |
|-------|--------|-----------------|
| Phase 1: Interaction Quality | ✅ Complete | Command undo/redo, alignment guides, collision detection, distance indicators |
| Phase 2: Spatial Data Model | ✅ Dual-write active | `asset_definitions` (304 rows), `layout_objects` table, canvas bridge, `layout_versions` DDL |
| Presentation View | ✅ Complete | `/present/[shareToken]`, unauthenticated 3D view, share button |
| 3D Asset Generation | ✅ 379 base meshes generated | AI-generated from Peak Event Services catalog, freelancer handoff sent for polish |

---

## Phase 2.5: Hardening Sprint (Do Next)

**Why now:** The audit exposed 3 issues directly in your critical path. Fix them before building more features on a shaky foundation. This is 1-2 days of work that prevents production failures.

### 2.5a — RLS Denormalization (1 hour)

Denormalize `user_id` onto `layout_objects`, `layout_versions`, and `tablescape_items`. Matches the pattern already applied to 5 other tables (`floor_plans`, `guests`, `vendors`, `invoices`, `schedule_items`).

```sql
-- Migration: add user_id + direct RLS (eliminates 2-hop JOIN on every query)
ALTER TABLE layout_objects ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE layout_versions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE tablescape_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Backfill from floor_plans → events
UPDATE layout_objects lo SET user_id = e.user_id
  FROM floor_plans fp JOIN events e ON e.id = fp.event_id
  WHERE fp.id = lo.floor_plan_id AND lo.user_id IS NULL;

-- Replace 2-hop RLS policies with direct user_id checks
-- (drop old policies, create new: using (user_id = auth.uid()))
```

**Why:** Every floor plan load currently does `layout_objects → floor_plans → events` to check ownership. When you wire the load path, this runs on every page open. Direct `user_id` check is O(1).

### 2.5b — THREE.js Memory Leak Fix (30 min)

Add `dispose()` calls for materials, geometries, and textures in `FloorPlan3DView.tsx` cleanup. The presentation view is the conversion moment — a client orbiting the 3D view for 2-3 minutes on mobile Safari will crash the tab without this.

```typescript
// In useEffect cleanup or component unmount:
scene.traverse((obj) => {
  if (obj instanceof Mesh) {
    obj.geometry.dispose();
    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
    else obj.material.dispose();
  }
});
renderer.dispose();
```

### 2.5c — Wire Phase 2 Load Path (2-3 hours)

Complete the round-trip: save to `layout_objects` → load from `layout_objects`. JSON blob becomes fallback.

1. In `page.tsx`, check `activePlan.layoutObjects.length > 0`
2. If yes, call `getAssetCatalog()` then `layoutObjectsToCanvasJSON()` to generate initial canvas state
3. If no, fall back to `activePlan.json` (legacy path)
4. Keep dual-write active until verified stable

### 2.5d — Remove Debug Logging (10 min)

Strip `[FloorPlan] dual-write` and `[LayoutObjects]` console.log statements added during debugging.

### 2.5e — Implement Protocol 6: Migration Drift Detection (1 hour)

Script that compares live Supabase schema against expected patterns. Would have automatically caught the `layout_objects` missing `user_id`. Catches future drift before it hits production.

```bash
# scripts/check-migration-drift.js
# Verifies: every table with FK to events has user_id column
# Verifies: every user_id column has matching RLS policy
# Verifies: new columns added to tables are reflected in ToRow/FromRow mappers
```

**Exit criteria:** Load path works, debug logging removed, RLS optimized, memory leak fixed, Protocol 6 catching drift automatically.

---

## Phase 3: 3D Rendering Upgrade

**Goal:** Replace procedural geometry with real GLTF models. This is the single biggest visual upgrade — procedural boxes look toy-like, real models close deals.

**Depends on:** Freelancer returning polished GLB batches (in progress).

### 3a — Fix Broken 3D Features (1-2 days)

1. **Re-enable post-processing** — Upgrade `@react-three/postprocessing` to v3.1+ or pin Three.js to compatible version. SSAO + Vignette are already coded, just commented out.
2. **Fix 3D text labels** — Download WOFF2 font to `/public/fonts/`, pass local path to drei `<Text>`. CSP blocks CDN font fetch.

### 3b — GLTF Model Loading Pipeline (3-5 days)

1. Build `useAssetModel(assetId)` hook — loads GLB via drei `useGLTF`, falls back to procedural
2. Gate by quality tier: GLTF on medium/high, procedural on low
3. Implement `<Instances>` for repeated geometry (critical: 200+ chairs per event)
4. LOD system: high-poly < 5m, low-poly 5-20m, procedural > 20m
5. Category-chunked manifest loading (don't load all 304 assets on page open)

### 3c — Chunk Models Manifest (1 day)

The current 172KB manifest loads all 278 models metadata on every page. Split by category so floor plan pages only load `floorplan/*` models, tablescape editor only loads `tablescape/*`.

### 3d — Real Texture Support (3-5 days)

1. Replace canvas-generated normals with tileable PBR texture sets (hardwood, marble, carpet, concrete)
2. Gate by quality tier: solid color (low), albedo (medium), full PBR (high)
3. Cache procedural textures instead of regenerating every render

### 3e — Camera + Polish (2-3 days)

1. Walkthrough camera mode (WASD + mouse-look, `PointerLockControls`)
2. Replace linear lerp with spring-damped interpolation
3. FPS counter in dev mode for regression testing

### 3f — Split FloorPlan3DView.tsx (1 day)

Before it grows further, split 2,500+ line file into focused modules:
- `FurnitureRenderer.tsx` — per-category rendering + GLTF loading
- `VenueEnvironment.tsx` — presets, walls, floors, textures
- `LightingSystem.tsx` — zones, moods, shadows
- `CameraSystem.tsx` — presets, walkthrough, animation
- `PostProcessing.tsx` — effects pipeline

**Exit criteria:** Real 3D models rendering for at least chairs + tables, SSAO active, text labels visible, 60fps with 300 objects on medium tier.

---

## Phase 4: Performance + Scale

**Why it's here:** With GLTF models loaded and structured data as source of truth, the system has more moving parts. Optimize before scaling to larger events.

### 4a — Spatial Indexing for Collision/Alignment (1 day)

Replace O(n²) brute force in `alignment-engine.ts` and `collision-detection.ts` with grid hash. Phase 1 handoff flagged this as needed at 500+ objects. With 304 asset types now available, planners will build denser layouts.

### 4b — Command History Deltas (1 day)

Replace full-canvas JSON snapshots in `pushUndo()` fallback with delta-based storage. GLTF model references in canvas JSON inflate snapshot size. Move remaining snapshot operations (room shape, layout templates, tablescape) to surgical commands.

### 4c — Paginated Fetchers (1 day)

Replace `.limit(500)` truncation with paginated fetches + `hasMore` flag. A 600-person wedding silently drops 100 guests — worse than an error because it's a silent wrong answer.

### 4d — Non-Atomic Replace Fix (1 day)

`replaceGuests`, `replaceGuestRelationships`, and similar functions do delete-all-then-insert. If interrupted, data is lost. Wrap in transactions or switch to upsert patterns (like `replaceLayoutObjects` already does).

### 4e — Monolithic RPC Optimization (2-3 days)

`get_client_event` does 14 subqueries in one RPC call. Split into lazy-loaded chunks matching the tab-based architecture (floor plans, guests, timeline, budget load independently).

**Exit criteria:** No O(n²) in hot path, no silent truncation, no non-atomic replaces, client RPC under 200ms.

---

## Phase 5: Parametric Tables + Version History

**Why it's here (not earlier):** These features build on the structured data model but don't block anything. Real planner feedback from the presentation view should inform the UX.

### 5a — Parametric Tables (3-5 days)

Seat count slider on selected table → auto-places/removes chairs using `snap_points` from `asset_definitions`. Proves the spatial data model works end-to-end.

1. Properties panel: seat count slider (min_seats → max_seats)
2. On change: read snap_points for the table's asset, place/remove chair objects at snap positions
3. Group into table set with `group_id`
4. Persist via existing dual-write

### 5b — Version History (3-5 days)

`layout_versions` table already exists. Build the UI:

1. "Save Version" button → snapshots current `layout_objects` into `layout_versions`
2. Version list sidebar with timestamps and labels
3. "Restore" → loads snapshot into canvas, overwrites current layout_objects
4. "Compare" → side-by-side or overlay diff (stretch)

**Exit criteria:** Planners can adjust seating with a slider, save named versions, restore previous layouts.

---

## Phase 6: Export + Templates

### 6a — PDF Export (3-5 days)

Generate print-ready PDF from floor plan: 2D layout + seating chart + table assignments. Use existing `floorplan-export-pdf.ts` infrastructure.

### 6b — Layout Templates (2-3 days)

Save current floor plan as reusable template. Load templates into new events. Templates store `LayoutObject[]` (structured data), not Fabric.js JSON.

### 6c — Kill the JSON Blob (1 day)

Once load path is verified stable and templates use structured data:
1. Remove `json` column write from `floorPlanToRow()`
2. Remove `initialJSON` prop from `FloorPlanEditor`
3. Remove `serializeFloorPlan` / `unwrapCanvasJSON` from `floorplan-schema.ts`
4. Mark `floor_plans.json` column as deprecated (don't drop yet — keep as emergency fallback)

**Exit criteria:** JSON blob no longer written or read. `layout_objects` is the sole source of truth.

---

## QA Protocol Status

| # | Protocol | Status | Catches |
|---|----------|--------|---------|
| 1 | Schema Validation at Build | ❌ Not implemented | Type drift between DB and code |
| 2 | Store Integration Tests | ❌ Not implemented | Sub-entity hydration bugs |
| 3 | Loud Failures (showErrorToast) | ✅ Implemented | Silent catch blocks |
| 4 | E2E Smoke Tests | ❌ Not implemented | Regression on deploy |
| 5 | Sub-Entity Key Registry | ✅ Implemented | Store key mismatches |
| 6 | Migration Drift Detection | ❌ Planned in 2.5e | Missing columns, RLS gaps |
| 7 | Registry Consistency | ✅ Implemented | SUB_ENTITY_KEYS out of sync |
| 8 | Client/Planner Parity | ✅ Implemented | Client missing data |
| 9 | Error Handling Lint | ✅ Implemented (baseline: 56) | New console.error without toast |
| 10 | Row Mapping Symmetry | ✅ Implemented | ToRow/FromRow column mismatch |

**Run all:** `npm run qa`

---

## Architecture Invariants

These hold across all phases:

1. **Fabric.js is the 2D engine** — all editor interaction goes through it
2. **layout_objects is the spatial source of truth** (once load path is wired)
3. **asset_definitions is the catalog source of truth** — no more split between constants.ts and manifest
4. **RLS on everything** — every table has user_id + direct policy (after 2.5a)
5. **Dual-write until Phase 6c** — JSON blob stays as fallback
6. **Quality tiers gate 3D features** — procedural fallback always available
7. **Presentation view is read-only** — clients see, never edit
8. **QA protocols run on every build** — `npm run qa` in CI
