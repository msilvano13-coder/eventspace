# EventSpace Handoff — March 29, 2026

## Current State: Phase 3 + Client Portal Fixes — Deployed
All code committed, pushed, deployed to Vercel production.
- **Latest commit:** `81fd13f` — Phase 3: rotation snapping, layout templates, 3D polish + client portal fixes
- **Branch:** `main`
- **Build:** Clean
- **Deploy:** `eventspace-k23dvxljn-msilvano13-coders-projects.vercel.app`

---

## What Was Done Today (March 29)

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

2. **`replaceGuests` delete-then-insert is dangerous** — All `replace*()` functions do DELETE ALL then INSERT. If INSERT fails, all data is permanently lost. Consider transactions or upsert.

3. **`eventFromRow` initializes empty sub-entity arrays** — Used for both full-event loads and core-only loads. Consider splitting into `eventCoreFromRow()` and `eventFullFromRow()`.

4. **Event creation spinning** — User previously reported pinwheel. Not fully debugged.
5. **Webhook idempotency** — No deduplication by Stripe event ID.

---

## All Commits (March 29)

| Commit | Description |
|--------|-------------|
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
⬜ Phase 4:  Venue library, mobile editor, real-time collaboration
```

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
