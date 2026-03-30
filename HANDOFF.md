# EventSpace Handoff — March 29, 2026

## Current State: Tech Debt Cleanup + 3D Room Fix — In Progress
- **Branch:** `main`
- **Build:** Clean (TypeScript passes)
- **Deploy:** `eventspace-19lw1wfrf-msilvano13-coders-projects.vercel.app`

---

## What Was Done Today (March 29)

### Session 4: Tech Debt Cleanup + 3D Room Floor Fix

**5 Tech Debt Items Resolved:**

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | `replace*()` delete-then-insert loses data on failure | Converted 11 functions to upsert pattern (`onConflict: "id"` + delete removed) | `db.ts` |
| 2 | Webhook idempotency | `stripe_webhook_events` table + claim-before-process dedup | `webhook/route.ts`, `webhook-idempotency-migration.sql` |
| 3 | `eventFromRow` ambiguity | Split into `eventCoreFields` (shared), `eventCoreFromRow` (core + floorPlans), `eventFromRow` (full) | `db.ts` |
| 4 | Event creation spinner stuck | Added `try/finally` with `setCreating(false)` | `planner/page.tsx` |
| 5 | Storage migration needed | Consolidated migration with storage columns, buckets, RLS policies | `migration.sql` |

**3D Room Floor Positioning Fix:**
- **Problem:** Room floor polygon appeared offset from furniture in 3D view
- **Root cause:** Fabric.js Polygon uses `originX: "left"` (left edge) while Groups use `originX: "center"`. The `parseCanvasJSON` stored `obj.x = polygon.left` (left edge), but the centroid/camera calculation treated it as center — shifting camera, grid, contact shadows, and lights away from the actual room position.
- **Fix:** Pre-compute absolute canvas coordinates for room polygon points in `parseCanvasJSON` using Fabric.js pathOffset formula: `centerX + (point.x - pathOffsetX) * scaleX`. Store true center in `obj.x/y` so centroid calculation works correctly. Simplified `RoomFloor` to use absolute coords directly.
- **File:** `FloorPlan3DView.tsx`

---

### Session 3: Floor Plan Phase 3 + Client Portal Bugs

**Test event:** Silvano Summer Gala 2026 (`218e9e36-bed1-4cba-8b99-fd30a3473366`)

#### Phase 3 Features

**Feature 1: Configurable Rotation Snapping**
- Files: `FloorPlanEditor.tsx`, `Toolbar.tsx`, `PropertiesPanel.tsx`
- Magnet button cycles through 15° → 30° → 45° → 90° → Off
- `RotationSnapValue` type: `15 | 30 | 45 | 90 | false`
- Properties panel rotation slider step dynamically matches snap angle
- Tooltip shows current snap angle

**Feature 2: Layout Templates**
- New file: `src/lib/layout-templates.ts`
- 5 pre-built layouts: Banquet Reception, Classroom, Theater/Ceremony, U-Shape Conference, Cocktail Party
- Each template specifies room preset + furniture placements (x, y, angle, isGroup)
- Atomic application via `skipSave` parameter on sub-functions (prevents cascading undo/save)
- Layout picker modal in FloorPlanEditor with 2-column grid

**Feature 3: 3D View Polish**
- File: `FloorPlan3DView.tsx`
- PBR materials per furniture category (roughness/metalness via `FURNITURE_PBR` map)
- `<Environment preset="apartment" />` for realistic lighting
- `<ContactShadows>` for ground shadows
- Scene fog for depth
- Shadow map resolution: 1024 → 2048, DPR: 1.5 → 2
- Rim light added, rect label font size increased

**Bug Fix: 3D furniture placement mirrored within room**
- File: `FloorPlan3DView.tsx` — `RoomFloor` component
- Root cause: The `RoomFloor` Shape (2D XY plane) is rotated `-π/2` around the X axis to lay flat, which maps Shape Y → World **-Z**. But furniture uses `posZ = +(canvasY - originY)`, mapping canvas Y → World **+Z**. This Z-axis flip caused furniture to appear at mirrored positions relative to the room floor.
- Fix: Negate the Y component in room shape points: `-(y + obj.y - originY) * S`
- Also removed temporary debug console.log statements

#### Critical Bug Fixes

**Bug: Floor plans not persisting** (root cause in `store.ts`)
- File: `src/lib/store.ts` — `getById()` method
- Root cause: `SUB_ENTITY_KEYS` filter was blocking `floorPlans` from being merged during `fetchEventCore`. Floor plans from DB were never loaded into the store. Page always saw empty floorPlans, created new defaults with new UUIDs, saved empty canvas, overwriting real DB data.
- Fix: Added `CORE_SUB_ENTITIES = new Set(["floorPlans"])` allowlist:
```typescript
const CORE_SUB_ENTITIES = new Set(["floorPlans"]);
const coreFields: Record<string, unknown> = {};
for (const [k, v] of Object.entries(full)) {
  if (!SUB_ENTITY_KEYS.has(k) || CORE_SUB_ENTITIES.has(k)) {
    coreFields[k] = v;
  }
}
```

**Bug: Lights can't be dragged**
- File: `FloorPlanEditor.tsx`
- Root cause: `syncLightingToCanvas` removes/recreates lighting objects when state changes. `object:moving` handler calls `onUpdateZones` → state change → sync destroys drag target mid-drag.
- Fix: `isDraggingLightRef` flag prevents sync during active drag, cleared on `mouse:up` and `object:modified`.

**Bug: Manual Save button added**
- Files: `FloorPlanEditor.tsx`, `Toolbar.tsx`
- Visual feedback states: idle → saving → saved (green) / error (red)
- `doSave()` function wraps `getCanvasJSON` + `serializeFloorPlan` + `onSaveRef`

#### Client Portal Fixes

**Bug: Client couldn't see contracts, invoices, budget, vendors**
- File: `src/app/client/[eventId]/page.tsx` line 62
- Root cause: `useEventSubEntities` only loaded 5 of 12 sub-entities
- Fix: Expanded to load all: `["timeline", "schedule", "vendors", "guests", "messages", "contracts", "invoices", "budget", "files", "questionnaires", "discoveredVendors"]`

**Bug: No assigned vendors section for clients**
- File: `src/app/client/[eventId]/page.tsx`
- Added "Your Vendors" section showing `event.vendors` with name, category badge, contact person, phone, email, notes
- Placed before "Discovered Vendors" section

**Bug: Files couldn't be downloaded or properly uploaded**
- File: `src/app/client/[eventId]/files/page.tsx` — full rewrite
- Upload now uses Supabase Storage via `uploadClientFile` API
- Download via signed URLs from `getClientSignedUrl` API
- File type inference from filename (contract, photo, moodboard, other)
- Error toasts for failed uploads/downloads (not silent failures)
- Loading spinner states during upload and download
- Stale reference fix: re-reads `event.files` before batch update

#### QA Audit Findings (5 issues, all fixed)
| Issue | Severity | Fix |
|-------|----------|-----|
| `inferFileType` never returned "moodboard" | High | Added filename checks for moodboard/inspiration |
| Silent failure when shareToken missing | Medium | Early return with error toast |
| No user feedback on upload errors | Medium | Error toast with failed file count |
| Download silently fails | Low | Error toast + handles empty URL |
| Stale `files` reference during upload | Low | Re-read event.files before update |

---

### Session 2: Floor Plan Phase 2 + Sub-Entity QA

#### Floor Plan Phase 2
1. **Smart Seating Algorithm** — `seating-algorithm.ts`: Greedy constraint-based auto-seater (VIP priority, group cohesion, dietary clustering, keep-together/keep-apart). `guest_relationships` table + RLS.
2. **Lighting-Furniture Snap** — `LightingZone` extended with `snappedToFurnitureId`. 40px proximity auto-snap.
3. **Floor Plan PDF Export** — `floorplan-export-pdf.ts`: Multi-page jsPDF.

#### Sub-Entity Persistence Bugs (5 found, 5 fixed)
| Commit | Bug |
|--------|-----|
| `74594ce` | `fetchEventCore` overwrites sub-entity data with empty arrays |
| `74594ce` | `useSyncExternalStore` not detecting sub-entity changes (missing `updatedAt` bump) |
| `6717012` | Sub-entity loading race condition (data discarded before hydration completes) |
| `fb1e567` | Timeline page loading wrong sub-entity (`"timeline"` instead of `"schedule"`) |
| SQL fix | `guests` table missing `guest_group` and `vip` columns |

### Session 1: Security Audit + Floor Plan Phase 1
| Commit | What |
|--------|------|
| `f60b8a2` | Server-side event limits, path traversal guards, payment verification |
| `613410b` | Mobile sign-out button |
| `4a839fd` | Critical column name fix: `planner_id` → `user_id` |
| `3823ff9` | Phase 1a: Lighting on canvas, schema versioning, grid perf, undo debouncing |
| `159e00f` | Phase 1b: Table capacity limits, real-world dimensions, multi-select, furniture groups |

---

## Key Architectural Insight: The Lazy Loading Flow

```
Page renders → useEvent(id)        → store.getById(id)
                                        ↓
                                  triggers fetchEventCore() (core fields + floorPlans)
                                        ↓
            useEventSubEntities()  → store.ensureSubEntity(id, "guests")
                                        ↓
                                  triggers fetchEventGuests() (sub-entity only)
                                        ↓
                              Both resolve → merge into event → emit → React re-renders
```

**Critical invariants:**
1. `getById()` must NEVER overwrite sub-entity keys (except `CORE_SUB_ENTITIES` like floorPlans)
2. `ensureSubEntity()` must ALWAYS bump `updatedAt` to trigger React re-renders
3. Every page must load ALL sub-entities it renders via `useEventSubEntities()`

---

## Known Issues (Not Blocking)

### Should Address Soon

1. **Missing DB columns for storage features** — Several tables reference `storage_path` columns in `db.ts` that may not exist in production:
   - `event_contracts`: `storage_path`, `storage_signed_path`, `storage_planner_sig`, `storage_client_sig`
   - `mood_board_images`: `storage_path`, `storage_thumb`
   - `shared_files`: `storage_path`
   - `contract_templates`: `storage_path`

   **Fix:** Run ALTER TABLE statements from migration.sql + `NOTIFY pgrst, 'reload schema'`

### Resolved (Session 4)
- ~~`replaceGuests` delete-then-insert~~ → Converted to upsert pattern
- ~~`eventFromRow` ambiguity~~ → Split into `eventCoreFromRow` / `eventFromRow`
- ~~Event creation spinner~~ → try/finally with `setCreating(false)`
- ~~Webhook idempotency~~ → `stripe_webhook_events` dedup table

---

## All Commits (March 29)

| Commit | Description |
|--------|-------------|
| `df4a8f0` | Fix 3D view furniture placement: room floor Z-axis was flipped relative to furniture |
| `89f0af8` | Fix layout templates overflow and improve 3D furniture rendering |
| `37074ba` | Show loading spinner instead of 'Event not found' during hydration |
| `2f4d937` | Update handoff doc with Phase 3 + client portal fixes |
| `81fd13f` | Phase 3: rotation snapping, layout templates, 3D polish + client portal fixes |
| `e122939` | Improve 3D view scale to match floor plan proportions |
| `8d5ad4e` | Fix 5 floor plan UX/UI issues from QA audit |
| `89dbe93` | Fix dead relationship manager button and moodboard double render |
| `74594ce` | Fix sub-entity data being wiped by fetchEventCore race condition |
| `fb1e567` | Fix timeline page loading wrong sub-entity |
| `6717012` | Fix sub-entity loading race condition (retry/poll for hydration) |

---

## Floor Plan Roadmap

```
✅ Phase 1a: Technical debt (lighting on canvas, schema, validation, grid, undo)
✅ Phase 1b: UX features (capacity, dimensions, multi-select, furniture groups)
✅ Phase 2:  Smart seating algorithm, lighting-furniture snap, PDF export
✅ Phase 3:  3D polish, layout templates, rotation snapping
✅ Tech debt: Upsert pattern, webhook idempotency, eventFromRow split, spinner fix
```

---

## 3D Upgrade Roadmap — "Polished Architectural Viz"

Goal: Professional, clean 3D rendering planners can screenshot for proposals. Stylized (not photorealistic) — think architectural diagram, not a photo.

### Step 1: GLTF Furniture Models (Biggest Visual Impact)
Replace colored boxes/cylinders with real 3D models (tables with tablecloths, chairs with legs, stages with risers).

**Architecture:**
- Add `public/models/` directory with `.glb` files (one per furniture type)
- Use `useGLTF` from `@react-three/drei` for loading + caching
- Map `furnitureId` → model path in a `FURNITURE_MODELS` record
- Fallback to current geometric shapes if model not loaded
- LOD (Level of Detail) for scenes with 200+ items

**Models Needed (priority order):**
| Model | Used For | Style |
|-------|----------|-------|
| Round table + tablecloth | `round-table-60`, `round-table-72` | White cloth drape, center visible |
| Rectangular table + cloth | `rect-table-6`, `rect-table-8` | Banquet linen |
| Chiavari chair | `chair` | Gold/clear, most common event chair |
| Cocktail table | `cocktail-table`, `high-top` | Tall pedestal, small top |
| Stage/riser | `stage` | Black platform, 12" height |
| Bar counter | `bar` | Front panel, counter surface |
| Lounge sofa | `lounge-sofa` | Tufted, low profile |
| Dance floor | `dance-floor` | Parquet tiles, reflective |
| DJ booth | `dj-booth` | Console with facade |
| Buffet station | `buffet-station` | Chafing dish row |

**Source options:**
- Free: Sketchfab CC0, Kenney.nl, Google Poly archive
- Paid ($5-15/model): CGTrader, TurboSquid "low-poly event" packs
- Custom: Blender → glTF export (most control over style consistency)

**Files to modify:**
- `FloorPlan3DView.tsx` — Add `GLTFFurniture` component, modify `FurnitureMesh` to try GLTF first
- New: `src/lib/furniture-models.ts` — Model path registry + preloader

**Estimated effort:** 1-2 sessions (loader infra + first 3-4 models)

---

### Step 2: Material & Lighting Upgrade
Improve floor, walls, and scene atmosphere without changing geometry.

**Changes:**
- **Floor texture:** Subtle wood grain or carpet pattern (use `useTexture` with a tileable image)
- **Wall material:** Drywall bump map, soft off-white, slight glossiness
- **Ambient occlusion:** `<EffectComposer>` + `<SSAO>` from `@react-three/postprocessing`
- **Tone mapping:** ACES filmic tone mapping for cinematic look
- **Better shadows:** PCF soft shadows, shadow bias tuning
- **Sky/Environment:** Neutral studio HDRI (not "apartment" — too residential)

**New dependency:** `@react-three/postprocessing`

**Files to modify:**
- `FloorPlan3DView.tsx` — Scene setup, materials, post-processing
- New: `public/textures/` — Floor wood, wall bump, tablecloth normal maps

**Estimated effort:** 1 session

---

### Step 3: Camera Presets & View Modes
One-click views that make the 3D useful for client presentations.

**Views:**
| Preset | Camera | Use Case |
|--------|--------|----------|
| Bird's Eye | Directly above, slight angle | Overview layout check |
| Guest POV | Eye level (5ft) from entrance | "What guests see walking in" |
| Stage View | From stage looking at audience | Speaker/performer perspective |
| Sweetheart View | From head table looking out | Couple's perspective |
| Walkthrough | Animated orbit path | Auto-play showcase |

**Implementation:**
- Preset buttons in 3D view toolbar
- Smooth camera transition via `gsap` or `@react-three/drei` `CameraShake`/lerp
- Walkthrough: keyframe array → `useFrame` interpolation

**Files to modify:**
- `FloorPlan3DView.tsx` — Camera preset logic
- `Toolbar.tsx` or new `View3DToolbar.tsx` — Preset buttons
- New dependency: `gsap` (optional, for smooth transitions)

**Estimated effort:** 1 session

---

### Step 4: Export & Share
Get the 3D view into planner proposals.

**Features:**
- **Screenshot export:** `canvas.toDataURL()` via R3F's `gl` context → PNG download
- **PDF integration:** Add 3D screenshot as page 1 of existing PDF export
- **Share link:** Read-only 3D view at `/client/[eventId]/floorplan` (already exists, just needs polish)
- **Embed snippet:** `<iframe>` code for venue websites
- **Layout comparison:** Side-by-side or toggle between floor plan variants in 3D

**Files to modify:**
- `FloorPlan3DView.tsx` — Screenshot capture function
- `floorplan-export-pdf.ts` — Add 3D render page
- `FloorPlanPage` — Export button wiring
- Client portal — Polish the existing 3D view

**Estimated effort:** 1 session

---

### Execution Order & Dependencies

```
Step 1 (GLTF Models) ← START HERE, biggest visual impact
    ↓
Step 2 (Materials)   ← builds on Step 1's models with better textures
    ↓
Step 3 (Camera)      ← independent, but better with good models
    ↓
Step 4 (Export)      ← captures everything above
```

### What We're NOT Doing (and why)
- **360° venue photos** — Doesn't scale (can't photograph every venue)
- **Photorealistic rendering** — Diminishing returns, long load times
- **WebXR/VR** — Tiny audience, big effort
- **Real-time collaboration** — Different initiative, not 3D-specific

---

## Current 3D Architecture (for reference)

### Coordinate System
- **Canvas (2D):** 1px = 1 inch. Fabric.js with Groups (`originX: "center"`) and Polygons (`originX: "left"`)
- **3D World:** `SCALE = 1/12` (12 inches = 1 world unit = 1 foot). `H_MULT = 1.8` for height exaggeration.
- **Conversion:** `worldX = (canvasX - canvasWidth/2) * SCALE`, `worldZ = (canvasY - canvasHeight/2) * SCALE`

### parseCanvasJSON Pipeline
```
Fabric.js JSON → unwrapCanvasJSON()
    ↓
processObject() recursion (handles Groups, Polygons, nested objects)
    ↓
ParsedObject[] — normalized items with absolute canvas coords
    ↓
Split into: rooms[] | furniture[] | lighting[]
    ↓
Each rendered by: RoomFloor | FurnitureMesh | LightingZone3D
```

### Furniture Rendering Categories (14)
Each `furnitureId` maps to a category with specialized Three.js geometry:
round-table, cocktail-table, rect-table, chair, sofa, service (bar/buffet),
flat-surface (dance floor), stage, dj-booth, photo-booth, arch,
flower-arrangement, draping, uplighting

### Key Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `S` (SCALE) | `1/12` | Inches to feet |
| `H_MULT` | `1.8` | Height exaggeration |
| `WALL_HEIGHT` | `96 * S = 8ft` | Room wall height |
| `MAX_SHADOW_LIGHTS` | `4` | GPU shadow budget |
| Color cache | LRU, max 200 | Prevent THREE.Color churn |

---

## Key Files Reference

| Purpose | File |
|---------|------|
| **Event store (core bug fixes here)** | `src/lib/store.ts` |
| **Store React hooks** | `src/hooks/useStore.ts` |
| **Database layer** | `src/lib/supabase/db.ts` |
| **DB migration/schema** | `supabase/migration.sql` |
| Floor plan editor | `src/components/floorplan/FloorPlanEditor.tsx` |
| Floor plan 3D view | `src/components/floorplan/FloorPlan3DView.tsx` |
| Floor plan toolbar | `src/components/floorplan/Toolbar.tsx` |
| Floor plan properties | `src/components/floorplan/PropertiesPanel.tsx` |
| Layout templates | `src/lib/layout-templates.ts` |
| Floor plan schema/validation | `src/lib/floorplan-schema.ts` |
| Seating algorithm | `src/lib/seating-algorithm.ts` |
| Floor plan PDF export | `src/lib/floorplan-export-pdf.ts` |
| Floor plan page (planner) | `src/app/planner/[eventId]/floorplan/page.tsx` |
| Client portal | `src/app/client/[eventId]/page.tsx` |
| Client files page | `src/app/client/[eventId]/files/page.tsx` |
| Auth middleware | `src/lib/supabase/middleware.ts` |

---

## Environment
- **Vercel:** Auto-deploys from `main`
- **Supabase:** Service role key in `.env.local`
- **Stripe:** Live mode, Smart Retry (8 attempts)
- **Test account (Pro):** ashley@ashleysilvanohair.com / skater87
- **Test account (DIY):** msilvano13@gmail.com
- **Contact:** michael@michaelsilvano.com
