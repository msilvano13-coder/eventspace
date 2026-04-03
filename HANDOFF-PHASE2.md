# Phase 2: Spatial Data Model — Handoff Doc

**Status:** Dual-write active, load path not yet wired
**Date:** 2026-04-03

---

## What Was Built

Phase 2 replaces the opaque Fabric.js JSON blob with structured, queryable spatial data. Every furniture item placed on the floor plan is now persisted as an individual row in `layout_objects` with typed columns for position, rotation, scale, grouping, and asset reference.

### Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  FloorPlanEditor │─save─▶ canvasToLayout   │─────▶│ layout_objects   │
│  (Fabric.js)     │      │ Objects()        │      │ (Supabase)       │
│                  │◀load─┤ layoutObjectsTo  │◀─────│                  │
│                  │      │ CanvasJSON()     │      │                  │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                                                    │
        │─── legacy save ──▶ events.floor_plans.json ────────│
        │                   (JSON blob — still active)       │
```

**Current state:** Both paths write on every save. Only the JSON blob is read on load. Wiring the load path from `layout_objects` completes the round-trip.

---

## New Database Tables

### `asset_definitions` (304 rows seeded)
Unified catalog merging 26 builtin furniture items + 278 3D models.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | text PK | Slug like `"round-table-60"` or `"centerpiece-roses"` |
| `category` | text | `table`, `seating`, `entertainment`, `decor`, etc. |
| `shape` | text | `circle` or `rect` (2D rendering) |
| `default_width/height/radius` | numeric | Inches |
| `fill_color/stroke_color` | text | Hex colors |
| `max_seats/min_seats/seat_spacing` | int/numeric | Capacity |
| `snap_points` | jsonb | `[{x, y, angle}]` for chair auto-placement |
| `model_file_path` | text | GLB path for 3D view |
| `physical_width_in/depth_in/height_in` | numeric | 3D dimensions |
| `source` | text | `builtin`, `model_manifest`, or `custom` |

### `layout_objects` (21+ rows, growing with each save)
Individual placed items on a floor plan.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Stable object identity |
| `floor_plan_id` | uuid FK | References `floor_plans` |
| `asset_id` | text FK | References `asset_definitions` |
| `position_x/y` | numeric | Canvas position (inches from origin) |
| `rotation` | numeric | Degrees |
| `scale_x/y` | numeric | Scale multipliers |
| `label` | text | Display name (e.g., `"Round Table (60\")"`) |
| `group_id` | uuid | Links table + chairs as a set |
| `parent_id` | uuid FK | Child→parent within a group |
| `table_id` | uuid | For guest seating assignment |
| `tablescape_id` | text | Linked tablescape |
| `z_index` | int | Render order |

### `layout_versions` (empty — not yet wired)
Snapshot-based version history for undo/restore at the floor-plan level.

| Column | Type | Purpose |
|--------|------|---------|
| `floor_plan_id` | uuid FK | References `floor_plans` |
| `version_number` | int | Sequential, unique per plan |
| `label` | text | User-facing name |
| `snapshot` | jsonb | Full `LayoutObject[]` at that point in time |
| `room_shape` | jsonb | Room polygon snapshot |

### `floor_plans` alterations
Three columns added: `room_shape` (jsonb), `canvas_width` (numeric), `canvas_height` (numeric).

---

## New Files

### `src/lib/floorplan/canvas-bridge.ts`
Adapter between `LayoutObject[]` and Fabric.js canvas JSON.

```typescript
// Save path: extract structured data from canvas
canvasToLayoutObjects(canvasJSON, floorPlanId): LayoutObject[]

// Load path: generate canvas JSON from structured data
layoutObjectsToCanvasJSON(objects, assetCatalog, canvasWidth, canvasHeight, roomShape): Record<string, unknown>

// Room shape extraction
roomShapeFromCanvas(canvasJSON): RoomShape | null
```

**Key behaviors:**
- Filters non-content objects (grid, lighting, guides, measures, room shape)
- Handles table-set Groups: extracts sub-items with absolute positioning
- Uses `_groupUUID` (not template slug) for `group_id` column
- Parents upserted before children to satisfy FK constraint

### `src/lib/floorplan/layout-objects.ts`
Supabase CRUD for the `layout_objects` table.

```typescript
fetchLayoutObjects(floorPlanId): Promise<LayoutObject[]>
replaceLayoutObjects(floorPlanId, objects, roomShape, canvasWidth, canvasHeight): Promise<void>
```

**`replaceLayoutObjects` flow:**
1. Update floor plan metadata (room_shape, canvas dimensions)
2. Upsert parent rows (tables, standalone items)
3. Upsert child rows (chairs linked via parent_id)
4. Delete rows no longer in the object list

### `src/lib/asset-catalog.ts`
Unified runtime lookup with Supabase fetch + in-memory cache + builtin fallback.

```typescript
getAssetCatalog(): Promise<Map<string, AssetDefinition>>   // async, cached
getAssetById(id): Promise<AssetDefinition | null>
getAssetByIdSync(id): AssetDefinition | null               // only after cache loaded
getCatalogSync(): Map<string, AssetDefinition> | null
invalidateAssetCache(): void
toLegacyFurnitureItemDef(asset): FurnitureItemDef           // backward compat
legacyToAssetDefinition(item): AssetDefinition              // forward compat
```

### `scripts/seed-asset-definitions.ts`
One-time seed script. Already run — 304 rows in `asset_definitions`.

```bash
npx tsx scripts/seed-asset-definitions.ts
```

---

## Modified Files

### `FloorPlanEditor.tsx`
- `doSave()` now dual-writes: legacy JSON + `canvasToLayoutObjects()` → `onSaveLayoutObjects` callback
- Props added: `floorPlanId`, `initialLayoutObjects`, `onSaveLayoutObjects`
- Table-set groups now carry `_groupUUID` for stable DB identity
- Debug logging active (search `[FloorPlan] dual-write` in console)

### `page.tsx` (planner/[eventId]/floorplan)
- `handleSaveLayoutObjects` callback calls `replaceLayoutObjects()` fire-and-forget
- Passes `floorPlanId` and `onSaveLayoutObjects` to editor

### `db.ts`
- `floorPlanFromRow()` includes `layoutObjects`, `roomShape`, `canvasWidth`, `canvasHeight`
- `floorPlanToRow()` writes `room_shape`, `canvas_width`, `canvas_height`
- Supabase select joins: `"*, floor_plans (*, lighting_zones (*), layout_objects (*))"`
- Added `layoutObjectFromRow()` / `layoutObjectToRow()` mappers

### `types.ts`
- Added: `SnapPoint`, `ModelVariant`, `AssetDefinition`, `LayoutObject`, `RoomShape`, `LayoutVersion`
- Updated: `FloorPlan` interface includes `layoutObjects`, `roomShape`, `canvasWidth`, `canvasHeight`

---

## What Remains (Load Path)

To complete the round-trip and make `layout_objects` the source of truth:

### 1. On page load, prefer `layout_objects` over JSON blob

In `page.tsx`, check if `activePlan.layoutObjects.length > 0`. If yes, pass them to the editor and use `layoutObjectsToCanvasJSON()` to generate the initial canvas state instead of `initialJSON`.

```typescript
// Pseudocode for the load decision
const hasStructuredData = activePlan.layoutObjects.length > 0;
const initialJSON = hasStructuredData
  ? layoutObjectsToCanvasJSON(activePlan.layoutObjects, catalog, ...)
  : activePlan.json;
```

### 2. Asset catalog must be loaded before canvas init

`layoutObjectsToCanvasJSON()` needs the `AssetDefinition` map to render shapes. Call `getAssetCatalog()` in the page component before passing data to the editor.

### 3. Keep dual-write active

Continue writing both JSON blob and `layout_objects` until you're confident the structured path is stable. Then drop the JSON blob write.

### 4. Remove debug logging

Search for `[FloorPlan] dual-write` and `[LayoutObjects]` console.log statements and remove them once the load path is verified.

---

## RLS Policies

All three new tables have RLS enabled with policies that join through `floor_plans → events → user_id = auth.uid()`. Standard CRUD policies (select, insert, update, delete) for `layout_objects`. Read-only for `asset_definitions` (public catalog). Same pattern for `layout_versions`.

---

## Known Gotchas

1. **Group positions in Fabric.js**: When objects are in an `ActiveSelection`, their `left`/`top` are relative to the selection group. Use `obj.getCenterPoint()` for absolute coords.

2. **`_groupUUID` vs `groupId`**: Canvas objects store `groupId` as the template slug (e.g., `"round-60-8"`) and `_groupUUID` as the actual UUID for the DB. The canvas-bridge uses `_groupUUID`.

3. **FK ordering**: `layout_objects.parent_id` references `layout_objects.id`. Parents must be upserted before children. `replaceLayoutObjects` handles this automatically.

4. **New UUIDs on each save for chairs**: Chairs in table sets get `uuid()` on every extraction (no stable `_objectId`). This means chair rows are recreated each save. Non-blocking but worth stabilizing later.

5. **`asset_definitions` cache**: The in-memory cache in `asset-catalog.ts` never expires during a session. Call `invalidateAssetCache()` if an admin adds new assets.

---

## File Index

| File | Role |
|------|------|
| `src/lib/floorplan/canvas-bridge.ts` | LayoutObject[] ↔ Fabric.js JSON |
| `src/lib/floorplan/layout-objects.ts` | Supabase CRUD for layout_objects |
| `src/lib/asset-catalog.ts` | Unified asset lookup with cache |
| `src/lib/types.ts` | AssetDefinition, LayoutObject, RoomShape, LayoutVersion |
| `src/lib/floorplan/index.ts` | Barrel exports |
| `supabase/phase2-spatial-model-migration.sql` | DDL for all 3 tables |
| `scripts/seed-asset-definitions.ts` | One-time asset seeder (304 rows) |
| `scripts/check-row-mapping-symmetry.js` | QA: updated for layout_objects |
| `scripts/check-error-handling.js` | QA: baseline updated to 56 |
