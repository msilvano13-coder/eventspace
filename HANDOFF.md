# EventSpace Handoff — March 30, 2026

## Current State: Session 9 Complete — Stripe Coupons, Trial Fix, 3D Lighting, UI Fixes
- **Branch:** `main`
- **Build:** Clean (zero errors)
- **Latest commit:** `43a34f5` — Fix Delete key removing furniture while typing in label input
- **Deploy:** Vercel (production, auto-deploy on push)
- **Migration:** `trial-fix-migration.sql` **NEEDS TO BE APPLIED** to Supabase (see below)

---

## What Was Done Today (March 30)

### Session 9: Stripe Coupons, DIY Paywall, 3D Lighting Fixes, UI Fixes

**1. Stripe Promotion Codes** (`b5a055a`)
- Added `allow_promotion_codes: true` to both DIY and Professional Stripe Checkout sessions
- Customers now see a promo code input field on the hosted Stripe checkout page
- Works with any coupon/promotion code created in the Stripe Dashboard
- File: `src/app/api/stripe/checkout/route.ts`

**2. DIY Plan Paywall — No Free Trial** (`c68ce4e`)
- **Problem:** All new users got a 30-day free trial automatically (via `handle_new_user` DB trigger), allowing DIY users to access the planner without paying
- **Fix:** New users now land on the upgrade page immediately. They must choose:
  - **DIY** → Stripe checkout for $99 (immediate payment required)
  - **Professional** → "Start 30-Day Free Trial" button activates trial explicitly
  - Expired trials see "Subscribe — $20/mo" instead
- New API route: `src/app/api/start-trial/route.ts` — sets `trial_ends_at = now + 30 days` only when explicitly requested
- Updated upgrade page: `src/app/planner/upgrade/page.tsx` — separate flows for DIY (checkout) and Professional (trial/subscribe)
- **DB migration required:** `supabase/trial-fix-migration.sql` — removes auto 30-day default from `trial_ends_at` column and updates `handle_new_user` trigger
- ⚠️ **ACTION REQUIRED:** Run `trial-fix-migration.sql` in Supabase SQL editor

**3. 3D Lighting: Visible Intensity & Spread** (`9522a46`)
- **Intensity:** Replaced quadratic curve (`t² × 12`) with linear mapping (`0.5 + t × 14.5`) — now 1% is visibly dim and 100% is bright, with noticeable changes across the full slider range
- **Beam spread:** Replaced `pointLight` (omnidirectional) with `spotLight` for downlights and uplights — the `angle` property now uses the actual spread slider value (10° = tight beam, 120° = flood)
- **Candles on furniture:** When a light has `snappedToFurnitureId`, it now looks up the furniture's height and positions the light on the surface (e.g., 30" for standard tables, 42" for high-tops)
- File: `src/components/floorplan/FloorPlan3DView.tsx`

**4. Properties Panel Fix** (`e593b37`)
- Properties panel (right side, rename/rotate/delete) was not appearing when selecting furniture
- Added `h-full` to PropertiesPanel wrapper and `overflow-hidden` to editor parent container so flex layout resolves height correctly
- Files: `src/components/floorplan/FloorPlanEditor.tsx`, `src/app/planner/[eventId]/floorplan/page.tsx`

**5. Delete Key in Label Input Fix** (`43a34f5`)
- Pressing Delete/Backspace while editing a furniture label in the properties panel was deleting the selected canvas object instead of deleting text in the input
- Added check to skip canvas delete handler when keypress originates from `<input>`, `<textarea>`, or `contenteditable` elements
- File: `src/components/floorplan/FloorPlanEditor.tsx`

**All Session 9 Commits:**
| Commit | Description |
|--------|-------------|
| `43a34f5` | Fix Delete key removing furniture while typing in label input |
| `e593b37` | Fix properties panel not showing when selecting furniture |
| `9522a46` | Fix 3D lighting: visible intensity/spread, candles on furniture |
| `c68ce4e` | Require payment for DIY plan — no free trial |
| `b5a055a` | Enable promotion codes on Stripe checkout and fix floorplan UI |

---

### Session 8: 3D Lighting Improvements + Production Crash Fixes

**4 Lighting Improvements** (built in prior session, deployed this session)
1. **Cone beams for spotlights** — visible 3D cone geometry for spotlight-type lights
2. **Ground light pools** — circular glow on floor beneath each light
3. **Uplight wall wash** — lights aimed upward cast color onto nearby walls
4. **Height/spread controls** — per-zone sliders for mounting height and beam spread angle

**Production Crash Fix 1: Environment HDR fetch blocked by CSP**
- drei's `<Environment>` fetches `.hdr` from `raw.githubusercontent.com`, blocked by `connect-src`
- Fix: Removed `<Environment>` entirely; scene uses ambient/directional/hemisphere lighting
- File: `FloorPlan3DView.tsx`

**Production Crash Fix 2: Text font fetch causes infinite Suspense**
- drei's `<Text>` (troika-three-text) fetches fonts from CDN, also blocked by CSP
- Since the 3D scene is inside `<Suspense fallback={null}>`, this silently rendered nothing
- Fix: Disabled `FurnitureLabel` (returns null), removed `Text` import
- File: `FloorPlan3DView.tsx`

**Production Crash Fix 3: Stack overflow when dragging lights**
- `object:moving` fired `onUpdateZones()` on every mouse frame → state → useEffect → `syncLightingToCanvas()` → Fabric events → state → infinite recursion
- Fix: (a) Don't update React state during drag — visual-only canvas movement, (b) removed direct `syncLightingToCanvas()` call from `object:modified`, (c) added re-entrancy guard to `syncLightingToCanvas`
- File: `FloorPlanEditor.tsx`

**CSP Restrictions (important for future drei usage)**
The Content-Security-Policy in `next.config.mjs` blocks external CDN fetches. Do NOT re-enable drei `Environment` or `Text` without either updating CSP or bundling assets locally.

**`optimizePackageImports` for three/R3F removed** — reduced to `["fabric"]` only. The three/R3F tree-shaking caused Object3D stack overflow. Could re-test in future but risky.

**Known Limitation: 3D labels disabled** — `FurnitureLabel` returns null. To restore:
- Bundle a local `.woff`/`.ttf` and pass to drei `<Text font={localPath}>`
- Or use `<Html>` from drei for HTML overlay labels

**All Session 8 Commits:**
| Commit | Description |
|--------|-------------|
| `6cfa511` | Fix stack overflow when dragging lighting zones |
| `172a3c3` | Fix eslint no-unused-vars on FurnitureLabel stub |
| `05b8b69` | Fix unused params lint error |
| `5c8fe33` | Fix 3D scene not rendering: remove Text component |
| `0690e2a` | Debug: blue background test (cleaned up) |

---

### Session 7: Scalability — Scale to 1,000-5,000 Users

Full scalability overhaul across database, query layer, client store, API, and bundle optimization. **No UX changes** at current data volumes — pagination only visible at 50+ events or 100+ guests.

**Database & RLS Optimization** (`supabase/scalability-migration.sql`) — ✅ APPLIED
- Denormalized `user_id` onto 5 high-traffic child tables: `guests`, `vendors`, `floor_plans`, `invoices`, `schedule_items`
- Backfill from parent `events` table + orphan row cleanup before NOT NULL constraint
- Composite indexes `(user_id, event_id)` on all 5 tables
- Replaced 20 EXISTS-subquery RLS policies with direct `auth.uid() = user_id` (O(1) vs O(n))
- Simplified 2-hop RLS on `vendor_payments`, `invoice_line_items`, `lighting_zones` to 1-hop via parent's new `user_id`
- Updated client portal RPCs (`client_update_guests`, `client_update_schedule`) to include `user_id` + missing `guest_group`/`vip` columns

**Query Layer** (`src/lib/supabase/db.ts`)
- `fetchEvents()` now paginated (50/page) returning `{ data: Event[], hasMore: boolean }`
- All 13 sub-entity fetchers capped with `.limit(500)` safety limit
- N+1 deletion loops fixed with batch `.in()` operations:
  - `replaceVendors`: vendor_payments batch delete
  - `replaceInvoices`: invoice_line_items batch delete
  - `replaceFloorPlans`: lighting_zones batch delete
- `getUserId()` cached with 30s TTL + `clearUserIdCache()` for logout
- Removed dead `fetchEventFull()` (monolithic 14-way join replaced by lazy loading in Session 2)
- All 5 `toRow` functions now include `user_id` (enabled post-migration)

**Client Store** (`src/lib/store.ts`)
- LRU eviction: max 100 cached events, least-recently-accessed evicted on overflow
- `loadMore()` method for event list pagination
- `hasMoreEvents` getter for UI "Load more" button
- Fixed `delete()` not removing from LRU access order
- Replaced `setInterval` polling (10 retries × 500ms) with exponential backoff (3 retries: 500ms, 1s, 2s)

**API & Infrastructure**
- Rate limiter memory cap (`src/app/api/discover/route.ts`): 10K entry max, flush expired on overflow, 429 if still over
- Middleware profile cache (`src/lib/supabase/middleware.ts`): extended from 5min to 15min, added `console.warn` on bad cookie parse
- Bundle optimization (`next.config.mjs`): `optimizePackageImports` for `three`, `@react-three/fiber`, `@react-three/drei`, `fabric`

**Deployment Status:** ✅ Fully complete
1. ✅ Code deployed to Vercel
2. ✅ `scalability-migration.sql` applied to Supabase
3. ✅ `user_id` enabled in all toRow functions
4. ✅ Final commit pushed (`9635210`)

**All Session 7 Commits:**
| Commit | Description |
|--------|-------------|
| `9635210` | Enable user_id in toRow functions after scalability migration applied |
| `3c46d73` | Update HANDOFF.md with Session 7 scalability details |
| `26f9c0c` | Scale EventSpace for 1,000-5,000 users: RLS, pagination, LRU, bundle optimization |
| `db91dbf` | Fix venue elements alignment: size to room polygon, not canvas |
| `76f1a2d` | Enhance 3D procedural furniture geometry for all 10 categories |

---

### Session 6: Chair Rotation, 3D Settings, Venue Presets, Lighting UX

**Chair Rotation Context-Aware Fix** (`151c522`, `1ebb05a`)
- Chairs now face outward in aisle/standalone placement, inward when part of a table set
- Added `inTableSet` boolean to `ParsedObject`, propagated through `processObject` recursion
- Table-set chairs get `Math.PI` rotation offset; standalone chairs face opposite direction
- Chair back panel geometry flipped to `d/2 - backThick/2`

**3D Settings Panel** (`1ebb05a`)
- New configurable settings panel in 3D view with 7 options:
  - Venue preset selector (tent, garden, rooftop, barn, beach, ballroom)
  - Floor material (hardwood, marble, carpet, concrete)
  - Lighting mood (warm, cool, dramatic, natural)
  - Show/hide walls, shadows, fog, labels
- `View3DSettings` interface in FloorPlan3DView.tsx
- Settings panel scrollable with `max-h-[80vh] overflow-y-auto`

**Venue Environment Presets** (`c41c862`)
- New file: `src/components/floorplan/VenueEnvironment.tsx` (~350 lines)
- 6 venue presets: Tent/Outdoor, Garden Party, Rooftop, Rustic Barn, Beach, Grand Ballroom
- Each preset defines floor material, lighting mood, wall visibility, environment HDRI, fog, and procedural elements
- Procedural 3D geometry components:
  - `TentStructure` — center pole + 4 corner poles + 4 canopy panels + edge valances
  - `GrassFloor` — large green plane below Y=0
  - `SkyDome` — inverted sphere with BackSide light blue material
  - `StringLights` — 3 parallel catenary curves with TubeGeometry wires + emissive bulbs + pointLights
  - `ExposedBeams` — ridge beam + cross beams at ceiling height
  - `LowRailing` — posts + top rail + glass panels around perimeter
  - `Chandeliers` — chain + torus rings + arms + candle meshes + pointLights
- New file: `src/lib/venue-models.ts` — GLTF model registry (same drop-in pattern as furniture-models.ts)

**New Tab Crash Fix** (`8b06e0b`)
- Root cause: stale closure race condition in editor unmount flush-save
- Old editor captured `handleSave` with stale `validPlans`, deleting newly created plan on unmount
- Fix: `validPlansRef` and `resolvedPlanIdRef` refs synced every render; `handleSave` reads from refs

**Floor Material Switching Fix** (`d17a362`)
- Two issues: (a) floor colors nearly identical — changed to visually distinct colors, (b) R3F `extrudeGeometry` material not updating reactively
- Fix: distinct `FLOOR_MATERIALS` colors + `key` prop on floor mesh to force remount on material change

**Lighting Panel UX + Rotation** (`6913ccb`)
- Added `angle: number` (0-360°) to `LightingZone` interface in types.ts
- Restructured `LightingPanel.tsx`: edit section now renders at TOP of panel when zone is selected
- Added "Done" button to deselect zone, rotation slider (0-360°, step 5°)
- Applied rotation CSS transform in `LightingOverlay.tsx`: `rotate(${zone.angle ?? 0}deg)`
- Applied `angle` to Fabric.js group in `FloorPlanEditor.tsx`
- Backward-compatible DB serialization in `db.ts` with `?? 0` fallback for existing zones

**All Session 6 Commits:**
| Commit | Description |
|--------|-------------|
| `6913ccb` | Add lighting rotation + move edit panel to top for better UX |
| `d17a362` | Fix floor material switching: distinct colors + force mesh remount |
| `c41c862` | Add venue environment presets: tent, garden, rooftop, barn, beach, ballroom |
| `8b06e0b` | Fix crash on new tab: prevent stale flush-save from deleting new plan |
| `151c522` | Fix chair rotation: face outward on aisle, inward at tables |
| `1ebb05a` | Fix chair facing direction + add 3D settings panel |

---

## What Was Done (March 29)

### Session 5: 3D Upgrade — Steps 1 & 2

**Step 1: Detailed Procedural Furniture Models** (`ccbf0cd`, `1d58d2e`)
Replaced basic box/cylinder geometry with detailed models for all 14 furniture categories:

| Category | What Changed |
|----------|-------------|
| Round tables | Tablecloth drape cylinder + base disc + pedestal + linen top disc |
| Rect tables | 4 wood legs + linen overhang panels on all 4 sides |
| Chairs | 4 tapered legs + seat cushion + solid back panel (Chiavari gold) |
| Cocktail tables | Thin top + cloth topper + chrome pole + heavy base disc |
| Sofas | 4 feet + seat with divider + back rest + 2 armrests |
| Bar/Buffet | Counter with overhang + front panel inset + foot rail (bar) |
| Stage | Platform + top surface + edge trim (3 sides) + front skirt |
| DJ Booth | Angled facade + countertop + equipment boxes on top |
| Dance floor | Surface + edge trim + tile grid lines |
| Flower arrangement | Tapered vase + rim + flower dome + leaf accents |
| Draping | Top rod + multiple fabric panels |
| Uplighting | Dark fixture + colored lens cap + transparent glow cone |
| Photo booth | Posts + top frame + backdrop curtain |
| Arch | Tapered columns + crossbar + decorative keystone |

Also created GLTF model registry (`src/lib/furniture-models.ts`) — drop `.glb` files into `public/models/` and uncomment mappings. Procedural geometry serves as fallback.

**Step 2: Scene Polish** (`a258e00`, `f7da5b4`, `d050ce9`)

| Change | Before | After |
|--------|--------|-------|
| Environment | "apartment" (residential) | "studio" (neutral, clean reflections) |
| Key light | Flat white | Warm `#fff5e6` from upper-right |
| Fill light | Same direction | Cool `#e0e8f0` from opposite side |
| Bounce | None | Hemisphere light (floor bounce sim) |
| Tone mapping | None | ACES Filmic (built-in Three.js) |
| Camera orbit | Instant | Smooth damping (0.08) |
| Floor | Flat matte `#faf7f0` | Warm wood `#d8cfc2` with sheen |
| Walls | Plain panels | Baseboard trim + wall + crown molding |
| Chair color | Catalog light gray | Chiavari gold `#c4a46c` / darker back `#a8905a` |
| Table legs | Catalog stroke (light) | Wood brown `#8b7355` |
| Linens | Pure white `#ffffff` | Warm cream `#f5f0e6` |
| Fog | Cool gray, close | Warm `#f0ece6`, pushed further |

**Postprocessing attempt & rollback:** Tried `@react-three/postprocessing` (SSAO + AGX tone mapping) but it crashed WebGL on some browsers. Reverted to Three.js built-in ACES Filmic tone mapping — same cinematic look, zero crash risk. Package is still in `package.json` but unused.

**Bug fixes this session:**
- Furniture palette not scrolling (parent div missing `h-full overflow-hidden`)
- ESLint unused variable blocking Vercel deploy
- `environmentIntensity` prop not supported in drei 9.121.5
- `SoftShadows` component crashing on some devices

---

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

### Resolved (Session 7)
- ~~Scalability migration not applied~~ → Applied to Supabase, `user_id` enabled in all toRow functions (`9635210`)

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
✅ Session 6: Chair rotation, 3D settings panel, venue presets, lighting rotation UX
✅ Session 8: 3D lighting (cone beams, light pools, wall wash, height/spread) + production crash fixes
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
| **Scalability migration** | `supabase/scalability-migration.sql` |
| Floor plan editor | `src/components/floorplan/FloorPlanEditor.tsx` |
| Floor plan 3D view | `src/components/floorplan/FloorPlan3DView.tsx` |
| 3D error boundary | `src/components/floorplan/FloorPlan3DErrorBoundary.tsx` |
| Lighting panel | `src/components/floorplan/LightingPanel.tsx` |
| Lighting overlay (2D) | `src/components/floorplan/LightingOverlay.tsx` |
| Venue environment (3D) | `src/components/floorplan/VenueEnvironment.tsx` |
| Venue model registry | `src/lib/venue-models.ts` |
| Furniture model registry | `src/lib/furniture-models.ts` |
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
