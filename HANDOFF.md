# EventSpace — Developer Handoff

## Overview

EventSpace is an event planning SaaS application with two primary surfaces: a **planner dashboard** for event professionals and a **client portal** for their clients. Built with Next.js 14 App Router, TypeScript, and Tailwind CSS (stone/rose palette). All data is stored in localStorage via custom stores using React's `useSyncExternalStore` — there is no backend or database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Floor Plans | Fabric.js 6 |
| PDF Export | jsPDF 4 |
| Icons | Lucide React |
| IDs | uuid v13 |
| Persistence | localStorage (no backend/database) |
| Deployment | Vercel |

---

## Architecture

### Data Layer

All persistence is handled through singleton store classes that serialize to localStorage. Each store follows the same pattern: a `Map`-based in-memory collection, a `hydrate()` method that loads from localStorage on first access, and a `persist()` method that serializes back after every mutation. React components subscribe via `useSyncExternalStore`.

| Store | File | Purpose |
|-------|------|---------|
| `EventStore` | `src/lib/store.ts` | All events and their nested data (vendors, guests, contracts, etc.) |
| `PlannerStore` | `src/lib/planner-store.ts` | Planner profile and branding |
| `QuestionnaireStore` | `src/lib/questionnaire-store.ts` | Reusable questionnaire templates |
| `ContractTemplateStore` | `src/lib/contract-template-store.ts` | Reusable contract templates |
| `PreferredVendorStore` | `src/lib/preferred-vendor-store.ts` | Planner's preferred vendor list |
| `InquiryStore` | `src/lib/inquiry-store.ts` | Inquiries and leads |

All store hooks live in `src/hooks/useStore.ts`. Each store has a `subscribeAndHydrate` wrapper that calls `hydrate()` before subscribing, ensuring lazy initialization.

**Critical: Migration Pattern**

When adding new fields to the `Event` type (or any nested type like `Vendor`, `Guest`, `EventContract`), you **must** add a corresponding migration in `store.ts` `hydrate()` to handle old data that lacks the new field. The hydrate method walks every event and backfills missing fields with sensible defaults. Failure to add a migration will cause runtime errors for users with existing data.

### Routing

```
/                              → Landing/redirect
/planner/                      → Planner dashboard (event grid)
/planner/[eventId]/            → Event detail (info, todos, schedule, budget, messages)
/planner/[eventId]/vendors/    → Vendor management + payments
/planner/[eventId]/guests/     → Guest list + RSVP tracking
/planner/[eventId]/contracts/  → Contract management + e-signatures
/planner/[eventId]/invoices/   → Invoice generation
/planner/[eventId]/timeline/   → Day-of schedule (drag-and-drop)
/planner/[eventId]/floorplan/  → Floor plan editor (Fabric.js)
/planner/[eventId]/moodboard/  → Mood board (image upload)
/planner/[eventId]/files/      → Shared files
/planner/calendar/             → Calendar view
/planner/reports/              → Analytics
/planner/finances/             → Financial overview
/planner/settings/             → Planner profile and branding
/planner/discover/             → Vendor marketplace (Google Places API)
/planner/preferred/            → Preferred vendor list
/planner/contracts/            → Contract template management
/planner/questionnaires/       → Questionnaire template management
/planner/inquiries/            → Leads/inquiries
/client/[eventId]/             → Client portal (main view)
/client/[eventId]/files/       → Client file view
/client/[eventId]/floorplan/   → Client floor plan view (read-only)
```

### Key Patterns

- **ConfirmDialog** (`src/components/ui/ConfirmDialog.tsx`) — Reusable confirmation modal used for all destructive actions throughout the app.
- **SignaturePad** (`src/components/ui/SignaturePad.tsx`) — Canvas-based e-signature component for contract signing flows.
- **Floor Plan System** — Multi-component system built on Fabric.js:
  - `FloorPlanEditor` — Main Fabric.js canvas with object manipulation
  - `LightingOverlay` — Visual lighting zone overlay
  - `LightingPanel` — Lighting type/color/intensity controls
  - `SeatingPanel` — Guest-to-table assignment
  - `FurniturePalette` — Draggable furniture items
  - `Toolbar` — Canvas tools (select, draw, delete, snap, zoom)
  - `PropertiesPanel` — Selected object properties editor
- **Event Archiving** — Events have an `archivedAt` timestamp (`null` = active). Archived events are hidden from the main dashboard and shown under the "Archived" tab.
- **Contract E-Signatures** — Dual signature flow: planner signs first, then the contract is shared to the client portal where the client adds their signature.
- **Monetary Values** — All monetary values (budget allocations, contract totals, payment amounts, invoice line items) are stored as numbers representing dollar amounts.
- **Budget Tracking** — Budget "spent" amounts are auto-derived from vendor contract payment totals, not stored separately.

### Client Portal Permissions

The client portal (`/client/[eventId]/`) is intentionally restricted:

**Read-Only:**
- Day-of schedule
- Color palette
- Budget overview
- Floor plans
- Mood board
- Vendor list (discovered vendors only)

**Editable by Client:**
- Guest RSVP status, meal choice, and dietary notes
- Questionnaire answers
- Contract e-signatures
- Messages

**Client Cannot:**
- Add or delete guests
- Edit the day-of schedule
- Modify budget allocations
- Edit floor plans
- Remove discovered vendors
- Access invoices or expenses

---

## Features by Page

### Planner Dashboard (`/planner/page.tsx`)
- Event grid with search (name, client name, venue)
- Status filter pills: All, Planning, Confirmed, Completed
- Sort options: date, name, last updated
- Active/Archived tabs with counts
- New event creation modal

### Event Detail (`/planner/[eventId]/page.tsx`)
- Event info editing (name, date, venue, status)
- Client info (name, email)
- To-do checklist with due dates and completion tracking
- Questionnaire assignment and review
- Day-of schedule
- Messaging (planner-client chat)
- Budget with category allocations (spent auto-derived from vendor payments)
- Expense tracking
- Color palette picker
- Archive/restore and delete actions

### Vendors (`/planner/[eventId]/vendors/page.tsx`)
- Full CRUD for vendors with category assignment
- Contract total tracking per vendor
- Payment schedule management (individual payment items with due dates, paid/unpaid status)

### Guests (`/planner/[eventId]/guests/page.tsx`)
- Guest list with RSVP status, meal choices, table assignments, plus-ones, dietary notes
- CSV import for bulk guest addition
- Search and filter capabilities
- RSVP summary statistics

### Contracts (`/planner/[eventId]/contracts/page.tsx`)
- Create contracts from templates or upload files
- E-signature flow: planner signs, shared to client, client signs
- Signature status tracking: unsigned, partially signed, fully signed

### Floor Plan (`/planner/[eventId]/floorplan/page.tsx`)
- Multi-tab floor plans (Ceremony, Cocktail Hour, Reception, Dance Floor, plus custom tabs)
- Fabric.js canvas with furniture palette, room shapes, drag-and-drop
- Lighting design overlay with zone types (uplight, spotlight, pinspot, gobo, wash, string lights, candles)
- Per-zone color, intensity, and size controls with lighting presets
- Seating assignment panel for guest-to-table mapping
- Mobile-optimized: collapsible lighting panel, pass-through overlay for canvas touch interaction

### Timeline (`/planner/[eventId]/timeline/page.tsx`)
- Day-of schedule with time slots
- Drag-and-drop reordering (desktop mouse + mobile touch support)

### Other Planner Pages
- **Invoices** — Line-item invoice creation with draft/sent/paid status
- **Mood Board** — Image upload with compression (1200px max, JPEG 0.7) and thumbnails (400px, JPEG 0.6)
- **Files** — Shared file uploads
- **Calendar** — Calendar view of events
- **Reports** — Analytics and reporting
- **Finances** — Financial overview across events
- **Discover** — Vendor marketplace powered by Google Places API
- **Preferred Vendors** — Planner's curated vendor list
- **Inquiries** — Lead tracking with inquiry/consultation status

---

## Known Issues & Future Work

### Should Fix (Medium Priority)

1. **FloorPlanEditor stale `snapEnabled` closure** — `src/components/floorplan/FloorPlanEditor.tsx` — The snap toggle has no effect during object drag because the value is captured in a stale closure inside the main `useEffect`. Needs a ref-based approach.
2. **SignaturePad canvas not responsive to resize** — Drawing coordinates get offset if the device is rotated while the pad is open.
3. **SeatingPanel duplicate React keys** — If two tables share the same label, React key collision occurs causing rendering issues.
4. **No file delete capability** — The Files page has upload functionality but no way to remove files once uploaded.
5. **CATEGORY_COLORS defined in 4 different files** with inconsistent values — Should be extracted to a single shared constant in `src/lib/`.
6. **Duplicate utility functions** scattered across files:
   - `formatBytes` in both `image-compress.ts` and `pdf-utils.ts`
   - `mapToVendorCategory` in both discover and preferred vendor pages
   - `renderStars` / `renderPrice` in both discover and preferred vendor pages
   - `fmt` currency formatter in 3+ files
7. **Toast pattern copy-pasted** across discover, preferred vendors, and contracts pages — Should be extracted to a shared hook (e.g., `useToast`).
8. **Legacy `floorPlanJSON` field** on the `Event` type is never cleaned up during migration. The field exists on the type but the app uses the `floorPlans` array instead.
9. **Settings page profile sync** — Initialization logic is fragile; should use a proper `useEffect` watching the profile store rather than the current approach.
10. **No vendor list visible in client portal** — Clients only see discovered vendors (from the marketplace), not the confirmed vendor roster assigned to their event.

### Accessibility (Low Priority)

- Missing `aria-label` on icon-only buttons throughout the app
- No focus trapping in modals
- Missing `role="dialog"` and `aria-modal` attributes on modals
- No keyboard alternative for drag-and-drop reorder (timeline, floor plan)
- Color-only status indicators for event states (planning/confirmed/completed) — needs text or icon alternatives

### Performance (Low Priority)

- Full localStorage serialization on every mutation — could be slow with large mood boards or contracts containing base64 file data
- Reports page recomputes all analytics on every render without memoization
- Event detail page is approximately 1300 lines with 15+ `useState` hooks — should be decomposed into sub-components or a reducer
- `estimateStorageUsed()` in the moodboard page runs on every render — should be memoized or moved to an effect

### Architecture (If Building a Backend)

- **No authentication on client portal** — Anyone with the event UUID can access the client portal. Consider adding a simple auth token or password for client portal links.
- **localStorage size limits** — All stores use localStorage which has a 5-10MB limit. Heavy mood boards and contracts with base64-encoded file data can hit this limit. Consider IndexedDB for file/image data and localStorage for metadata only.
- **No server-side validation** — All data validation is client-side only. A backend would need to replicate validation rules.
- **UUID-based access** — Event IDs are UUIDs used directly in URLs. A backend should add proper authorization checks.

---

## Environment Setup

```bash
npm install
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | For vendor discover | Google Places API key for the vendor marketplace |

### Deployment

- Deployed to **Vercel**
- No server-side data — fully client-side SPA with static export compatibility
- Auto-deploys from git push
- No environment secrets needed on the server (all data is client-side) except the Google Maps API key

---

## File Structure

```
src/
├── app/
│   ├── client/[eventId]/            # Client portal
│   │   ├── page.tsx                 # Main client view
│   │   ├── files/page.tsx           # Shared files (read-only)
│   │   └── floorplan/page.tsx       # Floor plan viewer (read-only)
│   ├── planner/                     # Planner dashboard
│   │   ├── page.tsx                 # Dashboard with search/filter/sort
│   │   ├── [eventId]/               # Event detail + sub-pages
│   │   │   ├── page.tsx             # Event detail (info, todos, budget, messages)
│   │   │   ├── vendors/page.tsx     # Vendor management
│   │   │   ├── guests/page.tsx      # Guest list
│   │   │   ├── contracts/page.tsx   # Contract management
│   │   │   ├── invoices/page.tsx    # Invoice generation
│   │   │   ├── timeline/page.tsx    # Day-of schedule
│   │   │   ├── floorplan/page.tsx   # Floor plan editor
│   │   │   ├── moodboard/page.tsx   # Mood board
│   │   │   └── files/page.tsx       # Shared files
│   │   ├── calendar/page.tsx        # Calendar view
│   │   ├── contracts/page.tsx       # Contract template management
│   │   ├── discover/page.tsx        # Vendor marketplace (Google Places)
│   │   ├── finances/page.tsx        # Financial overview
│   │   ├── inquiries/page.tsx       # Leads/inquiries
│   │   ├── preferred/page.tsx       # Preferred vendor list
│   │   ├── questionnaires/page.tsx  # Questionnaire template management
│   │   ├── reports/page.tsx         # Analytics
│   │   └── settings/page.tsx        # Planner profile/branding
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Landing/redirect
├── components/
│   ├── floorplan/                   # Floor plan system
│   │   ├── FloorPlanEditor.tsx      # Fabric.js canvas
│   │   ├── LightingOverlay.tsx      # Lighting zones overlay
│   │   ├── LightingPanel.tsx        # Lighting controls
│   │   ├── SeatingPanel.tsx         # Guest-to-table seating
│   │   ├── PropertiesPanel.tsx      # Selected object properties
│   │   ├── Toolbar.tsx              # Canvas toolbar
│   │   └── FurniturePalette.tsx     # Draggable furniture items
│   └── ui/
│       ├── ConfirmDialog.tsx        # Reusable confirmation modal
│       └── SignaturePad.tsx         # E-signature canvas component
├── hooks/
│   └── useStore.ts                  # All store hooks (useSyncExternalStore)
└── lib/
    ├── types.ts                     # All TypeScript interfaces and constants
    ├── store.ts                     # Main event store (EventStore class)
    ├── planner-store.ts             # Planner profile store
    ├── questionnaire-store.ts       # Questionnaire template store
    ├── contract-template-store.ts   # Contract template store
    ├── preferred-vendor-store.ts    # Preferred vendor store
    ├── inquiry-store.ts             # Inquiry/lead store
    ├── seed-data.ts                 # Demo/seed data
    ├── image-compress.ts            # Image compression utilities
    ├── pdf-utils.ts                 # PDF helper functions
    └── export-pdf.ts                # PDF export generation
```

---

## Data Model Reference

The complete data model is defined in `src/lib/types.ts`. Key types:

- **`Event`** — Top-level entity containing all nested data (vendors, guests, contracts, invoices, expenses, floor plans, mood board, messages, etc.)
- **`Vendor`** — Event vendor with category, contact info, contract total, and payment schedule (`VendorPaymentItem[]`)
- **`Guest`** — Guest with RSVP status, meal choice, table assignment, plus-one, dietary notes
- **`EventContract`** — Contract with file data (base64), dual e-signature fields (planner + client), timestamps
- **`Invoice`** — Invoice with `InvoiceLineItem[]` and draft/sent/paid status
- **`FloorPlan`** — Floor plan tab with Fabric.js JSON and `LightingZone[]`
- **`MoodBoardImage`** — Compressed image URL (base64), thumbnail, and caption
- **`BudgetItem`** — Budget category with allocated amount (spent is derived from vendor payments via `VENDOR_TO_BUDGET_CATEGORY` mapping)
- **`PlannerProfile`** — Business name, branding (logo, brand color, tagline), contact info
- **`Questionnaire`** / **`QuestionnaireAssignment`** — Reusable template and per-event assignment with client answers
- **`Inquiry`** — Lead with client info, event date, estimated budget, inquiry/consultation status
- **`ContractTemplate`** / **`PreferredVendor`** — Planner-level reusable resources
- **`ScheduleItem`** — Day-of timeline entry (time in HH:MM 24h format + title + notes)
- **`TimelineItem`** — To-do checklist item with due date, completion status, and sort order
- **`Message`** — Chat message with sender role (planner/client), sender name, text, timestamp
- **`SharedFile`** — Uploaded file with type classification (contract/photo/moodboard/other)
- **`Expense`** — Business expense with amount, category, date, and notes
