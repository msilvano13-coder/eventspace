# EventSpace Handoff — March 29, 2026

## Current State: Production-Ready + Phase 2 Floor Plan Complete
All code committed, pushed, deploying on Vercel. No pending changes.
- **Latest commit:** Phase 2: Smart seating, lighting snap, floor plan PDF export
- **Branch:** `main`
- **Build:** Clean (warnings only — img alt props, no errors)

---

## What Was Done Today (March 29)

### Session: Floor Plan Phase 2 — Smart Seating, Lighting Snap, PDF Export

**Three major features:**

1. **Smart Seating Algorithm — fully wired**
   - `seating-algorithm.ts`: Greedy constraint-based auto-seater (VIP priority, group cohesion, dietary clustering, keep-together/keep-apart)
   - DB functions in `db.ts`: `fetchGuestRelationships`, `upsertGuestRelationship`, `deleteGuestRelationship`, `replaceGuestRelationships` with row mappers
   - `guest_relationships` table + RLS policies in migration.sql
   - SeatingPanel now accepts `relationships` prop (was hardcoded `[]`)
   - Floor plan page fetches relationships from Supabase on mount, passes to SeatingPanel
   - **Guests page**: New collapsible "Seating Relationships" section — Guest 1 / Rule (Together|Apart) / Guest 2 dropdowns, add/remove, color-coded badges

2. **Lighting-Furniture Snap**
   - `LightingZone` type extended with optional `snappedToFurnitureId`
   - FloorPlanEditor `object:moving` handler detects proximity (40px) to furniture objects, auto-snaps lighting zones to furniture center
   - LightingPanel shows violet "snapped to" badge per zone in list
   - Edit panel shows snap target with Unsnap button, or guidance text when not snapped

3. **Floor Plan PDF Export**
   - New `floorplan-export-pdf.ts` — multi-page jsPDF export:
     - Page 1: Event header, plan name, scale note, floor plan canvas image
     - Page 2: Furniture legend (item, category, dimensions, seats) + lighting zones (color swatches, type, intensity, snap targets, notes)
     - Page 3: Seating chart (guests grouped by table with meal/dietary info)
     - Footer with page numbers on all pages
   - PDF button added to floor plan top bar (FileDown icon)
   - `onCanvasReady` callback on FloorPlanEditor exposes data URL getter (hides grid for clean export)

**Also included:**
- `group` and `vip` fields added to Guest type + client portal CSV import compatibility fix
- `guest_group` and `vip` columns added to guests table in migration.sql

---

## Previous Work

### March 28 — Session 1: Security Audit + Fixes
| Commit | What |
|--------|------|
| `f60b8a2` | Server-side event limits, path traversal guards, payment verification, account deletion cleanup |
| `613410b` | Mobile sign-out button in "More" sheet |
| `4a839fd` | Critical column name fix: `planner_id` → `user_id` in 4 queries |

### March 28 — Session 2: Floor Plan Phase 1a — Technical Debt
**Commit `3823ff9`** — Major refactor:
1. **Lighting zones moved onto Fabric.js canvas** (was separate HTML overlay)
2. **Schema versioning** — `{ version: 1, canvas: {...} }` envelope
3. **JSON validation** — 10MB limit, structure checks, max 5000 objects
4. **Grid performance** — cached refs, excluded from saves
5. **Undo debouncing** — 150ms debounce, flush before undo/redo

### March 28 — Session 2: Floor Plan Phase 1b — UX Features
**Commit `159e00f`** — Four new features:
1. **Table capacity limits** — `maxSeats` on all table types, color-coded badges
2. **Real-world dimensions** — 1px = 1 inch scale, properties panel shows feet/inches
3. **Multi-select + batch ops** — Ctrl+A, Ctrl+C/V, batch delete/rotate
4. **Furniture groups** — 5 presets (Round 60"+8, Round 72"+10, Rect 6'+6, Rect 8'+8, Sweetheart+2)

---

## Floor Plan Roadmap — Where We Are

```
✅ Phase 1a: Technical debt (lighting on canvas, schema, validation, grid, undo)
✅ Phase 1b: UX features (capacity, dimensions, multi-select, furniture groups)
✅ Phase 2:  Smart seating algorithm, lighting-furniture snap, PDF export
⬜ Phase 3:  3D perspective, layout templates, rotation snapping
⬜ Phase 4:  Venue library, mobile editor, real-time collaboration
```

### Phase 3 Details (Next Up)
1. **3D perspective view** — Toggle between 2D editor and 3D preview of the floor plan
2. **Layout templates** — Pre-built room layouts (banquet, classroom, theater, U-shape) users can start from
3. **Rotation snapping** — 15° or 45° increments when rotating furniture, with visual guides

---

## Architecture Overview

### Plans & Billing
- **Trial:** 3 active events, full Pro features, time-limited
- **DIY:** 1 active event, $149 one-time, limited features
- **Professional:** 999 events, $49/mo, all features
- **Expired:** 0 events, must upgrade

### Floor Plan System
- **Canvas:** Fabric.js v6.9.1 (2D HTML5 Canvas)
- **Scale:** 1px = 1 inch (explicit in `PIXELS_PER_INCH`)
- **Grid:** 20px (20 inches) snap
- **Objects:** 28 individual items + 5 furniture groups
- **Lighting:** 7 zone types, rendered as native Fabric objects, snap-to-furniture (40px threshold)
- **Seating:** Greedy constraint algorithm with keep-together/apart, VIP priority, group cohesion
- **Schema:** Versioned envelope `{ version: 1, canvas: {...} }`
- **Save:** 800ms debounced auto-save, validated before write
- **Undo:** 150ms debounced, max 30 states, grid+lighting excluded
- **Export:** PNG (canvas.toDataURL) + PDF (jsPDF with legend, seating chart, lighting notes)

### Storage (Supabase Storage)
- 3 buckets: `event-files` (private), `contract-templates` (private), `brand-assets` (public)
- Dual-read: `storagePath` ?? base64 fallback
- Client portal: API routes with share token validation

### Security
- Middleware: plan-based route gating, auth checks, trial expiry
- `safeProfileToRow()`: strips privileged fields
- Storage APIs: bucket whitelist, path traversal guards, 10MB limit
- Stripe webhook: `invoice.payment_failed` → expires after 8 attempts
- Account deletion: Storage → Stripe → DB → Auth cascade

### Database
- All tables use `user_id` (NOT `planner_id`)
- 24 tables with RLS policies (added `guest_relationships`)
- Migration includes: `guest_group` + `vip` columns on guests, `guest_relationships` table

---

## Known Issues / Future Work

### Should Address Soon
1. **Event creation spinning** — User reported pinwheel. Not fully debugged.
2. **Webhook idempotency** — No deduplication by Stripe event ID.
3. **`LightingOverlay.tsx` dead code** — Can be deleted (replaced by canvas-native rendering).
4. **Export doesn't reset zoom** — PNG export includes zoom transform.
5. **Initial undo baseline includes grid objects** — Minor, first undo may be slightly off.

### Remaining Phase 1a Audit Items (Low Severity)
- Hex shorthand edge case in lighting gradient colors
- `ClientFloorPlanView.tsx` may be dead code (client uses FloorPlanEditor with readOnly)
- Cleanup effect doesn't clear refs on unmount (only matters in strict mode)

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Floor plan editor (main) | `src/components/floorplan/FloorPlanEditor.tsx` |
| Floor plan schema/validation | `src/lib/floorplan-schema.ts` |
| Furniture catalog + groups | `src/lib/constants.ts` |
| Lighting panel | `src/components/floorplan/LightingPanel.tsx` |
| Seating panel (capacity) | `src/components/floorplan/SeatingPanel.tsx` |
| Seating algorithm | `src/lib/seating-algorithm.ts` |
| Floor plan PDF export | `src/lib/floorplan-export-pdf.ts` |
| Event summary PDF export | `src/lib/export-pdf.ts` |
| Properties panel (dimensions) | `src/components/floorplan/PropertiesPanel.tsx` |
| Furniture palette (+ groups) | `src/components/floorplan/FurniturePalette.tsx` |
| Toolbar (copy/paste/etc) | `src/components/floorplan/Toolbar.tsx` |
| Planner floor plan page | `src/app/planner/[eventId]/floorplan/page.tsx` |
| Planner guests page | `src/app/planner/[eventId]/guests/page.tsx` |
| Client floor plan page | `src/app/client/[eventId]/floorplan/page.tsx` |
| Type definitions | `src/lib/types.ts` |
| Database layer | `src/lib/supabase/db.ts` |
| Auth middleware | `src/lib/supabase/middleware.ts` |
| Stripe webhook | `src/app/api/stripe/webhook/route.ts` |
| Account deletion | `src/app/api/account/delete/route.ts` |

---

## Environment
- **Vercel:** Auto-deploys from `main`
- **Supabase:** Service role key in `.env.local`
- **Stripe:** Live mode, Smart Retry (8 attempts), email receipts on
- **Test account:** msilvano13@gmail.com (DIY plan)
- **Contact email:** michael@michaelsilvano.com
