# EventSpace — Developer Handoff Document

## Overview

EventSpace is a SaaS web app for wedding/event planners to manage events, clients, vendors, budgets, floor plans, and more. Clients get a branded portal to collaborate on their event details.

**Repo:** `github.com/msilvano13-coder/eventspace`
**Live:** `eventspace-nine.vercel.app`
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Fabric.js · jsPDF · localStorage

---

## Quick Start

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Production build
npm run start    # Serve production build
```

No `.env` file needed — all data lives in browser localStorage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + custom config |
| Canvas | Fabric.js 6.9 (floor plan editor) |
| PDF | jsPDF (client-side PDF generation) |
| Icons | Lucide React 1.7 |
| State | localStorage + `useSyncExternalStore` |
| Fonts | Playfair Display (headings) + Inter (body) |
| Colors | Stone/Rose palette with brand color override |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                         # Root layout (fonts, metadata)
│   ├── globals.css                        # Tailwind + custom styles
│   ├── page.tsx                           # Redirects to /planner
│   │
│   ├── planner/                           # Planner-facing pages
│   │   ├── layout.tsx                     # Sidebar + main content layout
│   │   ├── page.tsx                       # Dashboard (event cards)
│   │   ├── inquiries/page.tsx             # Lead pipeline (Inquiry → Consultation → Book)
│   │   ├── calendar/page.tsx              # Monthly calendar view
│   │   ├── questionnaires/page.tsx        # Questionnaire templates list
│   │   ├── questionnaires/[id]/page.tsx   # Questionnaire builder/editor
│   │   ├── finances/page.tsx              # Financial summary across events
│   │   ├── reports/page.tsx               # Analytics (revenue, status, busiest months)
│   │   ├── directory/page.tsx             # Vendor directory (contact + events)
│   │   ├── settings/page.tsx              # Planner profile & branding
│   │   └── [eventId]/
│   │       ├── page.tsx                   # Event detail (all sections)
│   │       ├── moodboard/page.tsx         # Pinterest-style mood board
│   │       ├── timeline/page.tsx          # Day-of timeline
│   │       ├── guests/page.tsx            # Guest list, RSVP, seating
│   │       ├── invoices/page.tsx          # Invoice CRUD
│   │       ├── files/page.tsx             # File sharing
│   │       └── floorplan/page.tsx         # Floor plan editor (Fabric.js)
│   │
│   └── client/[eventId]/                  # Client portal (shareable link)
│       ├── page.tsx                       # Client dashboard (branded)
│       ├── files/page.tsx                 # Client file access
│       └── floorplan/page.tsx             # Client floor plan view/edit
│
├── components/
│   ├── layout/Sidebar.tsx                 # Desktop sidebar + mobile bottom nav + "More" sheet
│   ├── floorplan/
│   │   ├── FloorPlanEditor.tsx            # Main Fabric.js canvas component
│   │   ├── Toolbar.tsx                    # Drawing tools
│   │   ├── FurniturePalette.tsx           # Drag-and-drop furniture
│   │   ├── PropertiesPanel.tsx            # Object properties editor
│   │   ├── SeatingPanel.tsx               # Table/seating management
│   │   └── furniture-items.ts             # Furniture item definitions
│   ├── event/MessageThread.tsx            # Planner ↔ client messaging
│   └── client/ClientFloorPlanView.tsx     # Read-only floor plan renderer
│
├── hooks/useStore.ts                      # All React hooks for state access
│
└── lib/
    ├── types.ts                           # All TypeScript interfaces
    ├── constants.ts                       # Furniture catalog, room presets
    ├── store.ts                           # EventStore (localStorage CRUD)
    ├── questionnaire-store.ts             # QuestionnaireStore
    ├── planner-store.ts                   # PlannerProfileStore
    ├── inquiry-store.ts                   # InquiryStore
    ├── export-pdf.ts                      # PDF export (event summary generator)
    └── seed-data.ts                       # 3 demo events
```

---

## Data Model (types.ts)

### Core Entities

| Type | Key Fields | Notes |
|------|-----------|-------|
| **Event** | id, name, date, venue, clientName, clientEmail, status | Central entity. Status: planning/confirmed/completed |
| **Inquiry** | id, name, clientName, status, eventDate, estimatedBudget | Pre-event lead. Status: inquiry/consultation |
| **PlannerProfile** | businessName, logoUrl, brandColor, tagline | Applied to client portal branding |
| **Questionnaire** | id, name, questions[] | Reusable templates assigned to events |

### Nested in Event

| Type | Purpose |
|------|---------|
| **FloorPlan** | Multi-tab floor plans (Fabric.js JSON) |
| **Guest** | RSVP, meal choice, table assignment, +1 |
| **Vendor** | Category, contact info, contractTotal, payments[] |
| **VendorPaymentItem** | Per-vendor payment schedule (amount, dueDate, paid) |
| **BudgetItem** | Category allocation — spent derived from vendors |
| **Invoice** | Line items, status (draft/sent/paid), due date |
| **Expense** | Planner business expenses (for taxes) |
| **MoodBoardImage** | Base64 image, caption, timestamp |
| **TimelineItem** | To-do checklist with due dates |
| **ScheduleItem** | Day-of timeline (time + title) |
| **Message** | Planner ↔ client chat thread |
| **SharedFile** | Contracts, photos, moodboards |

### Key Mapping

```typescript
VENDOR_TO_BUDGET_CATEGORY: Record<VendorCategory, string>
// Maps vendor categories → budget categories for auto-tracking
// e.g., "photography" → "Photography", "flowers" → "Flowers & Decor"
```

Budget "committed" and "paid" amounts are **derived** from vendors, not manually entered.

---

## State Management

Four separate localStorage-backed stores, all following the same pattern:

```
store.ts              → "eventspace-data"             → Event[]
questionnaire-store.ts → "eventspace-questionnaires"   → Questionnaire[]
planner-store.ts      → "eventspace-planner-profile"  → PlannerProfile
inquiry-store.ts      → "eventspace-inquiries"        → Inquiry[]
```

**Pattern:** Each store has `hydrate()`, `getSnapshot()`, `subscribe()`, `create()`, `update()`, `delete()`, `persist()`. Hooks in `useStore.ts` use React's `useSyncExternalStore` for reactivity.

**Migrations:** `store.ts` hydrate() includes data migrations for schema evolution (adding missing fields, removing deprecated ones).

---

## Navigation

### Desktop: Sidebar (always visible at md+ breakpoint)
All 7 nav items + Settings at bottom.

### Mobile: Bottom nav (5 items) + "More" sheet
- **Bottom bar:** Dashboard, Inquiries, Calendar, Questionnaires, More
- **"More" sheet:** Finances, Reports, Directory, Settings (3-column grid)

---

## Key Features

### Inquiry Pipeline (`/planner/inquiries`)
- Two-column layout: Inquiry → Consultation
- Cards expand to show contact details, venue, budget, notes
- "Move to Consultation" advances status
- "Book as Event" converts inquiry to a full Event and removes from pipeline

### Floor Plan Editor (`/planner/[eventId]/floorplan`)
- Fabric.js canvas with multi-tab support (Ceremony, Cocktail, Reception, Dance Floor)
- Furniture palette with 25+ items (tables, chairs, stages, bars, etc.)
- Room shape presets (Rectangle, L-Shape, T-Shape, Ballroom, Gallery)
- Properties panel for editing selected objects
- Seating panel for table/guest assignment (mobile: full-screen overlay; desktop: side panel)
- Canvas state serialized to JSON in `event.floorPlans[].json`

### Mood Board (`/planner/[eventId]/moodboard`)
- Pinterest-style masonry grid (2-col mobile, 3-col tablet, 4-col desktop)
- Image upload via base64 data URLs (2MB per image limit)
- Editable captions with hover-to-reveal UI
- Delete with hover X button
- Also visible (read-only) in client portal

### PDF Export (`lib/export-pdf.ts`)
- Client-side PDF generation using jsPDF
- "Export PDF" button on event detail page header
- Includes: event details, client info, guest summary, vendors, budget, to-do list, day-of schedule, color palette
- Uses planner business name for "Prepared by" line
- Auto-paginated with page numbers and footer

### Budget ↔ Vendor Integration
- Client creates budget categories with allocated amounts
- As vendors are added with contract totals and payment schedules, budget auto-tracks:
  - **Committed** = sum of vendor contract totals matching the budget category
  - **Paid** = sum of paid vendor payments in that category
- `VENDOR_TO_BUDGET_CATEGORY` mapping handles the link

### Client Portal (`/client/[eventId]`)
- Branded with planner's logo, business name, brand color
- Clients can view/edit: questionnaires, color palette, guest RSVPs, budget, floor plans, messages
- Mood board visible when images exist
- Shareable link — no auth required

### Reports (`/planner/reports`)
- Revenue by month (invoiced vs. paid bar chart)
- Events by status (stacked bar + breakdown)
- Busiest months (12-month bar chart)
- Summary cards: Total Invoiced, Collected, Expenses, Avg/Event

---

## Event Detail Page Layout

The event detail page (`/planner/[eventId]`) uses a sectioned layout:

1. **Header** — Event name, date, venue, edit button, Export PDF, Copy Client Link
2. **Quick Actions** — 6-card grid: Floor Plan, Files, Timeline, Invoices, Guests, Mood Board
3. **Client Details** — Name + email (editable)
4. **Color Palette + To Do List** — Side-by-side 2-column grid on desktop
5. **Questionnaires** — Assigned templates with completion tracking
6. **Vendors** — Full vendor management with payment schedules
7. **Client Budget** — Category allocations with auto-derived vendor totals
8. **Expenses** — Business expense tracking (visually separated from budget)
9. **Messages** — Planner ↔ client chat thread
10. **Danger Zone** — Delete Event (separated with divider)

---

## Styling Conventions

- **Card pattern:** `bg-white rounded-2xl border border-stone-200 p-5 shadow-soft`
- **Button primary:** `bg-rose-400 hover:bg-rose-500 text-white rounded-xl`
- **Input:** `border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30`
- **Status badges:** `text-[11px] px-2.5 py-1 rounded-full font-medium` + color class
- **Section headings:** `font-heading font-semibold text-stone-800`

Custom Tailwind shadows in `tailwind.config.ts`:
- `shadow-soft`: subtle card shadow
- `shadow-card`: hover elevation

---

## Known Limitations / Future Work

| Area | Current State | Improvement |
|------|--------------|-------------|
| **Auth** | None — open access | Add Clerk/NextAuth for planner login + client invite links |
| **Storage** | localStorage only | Migrate to Supabase/Postgres for persistence |
| **File uploads** | Base64 data URLs (logo, mood board) | Cloud storage (S3/Cloudflare R2) |
| **Mood board** | Base64 in localStorage | Could get large with many images; consider cloud storage |
| **Floor plans** | Canvas JSON in localStorage | Could get large; consider separate storage |
| **Client portal** | No auth gate | Magic links or password protection |
| **Real-time** | No sync between tabs/devices | WebSocket or polling for multi-user |
| **Email** | Not implemented | Send invoices, questionnaire links, reminders |
| **Search** | Basic text filtering on some pages | Full-text search across events |

---

## Deployment

**Live:** `eventspace-nine.vercel.app`
**Repo:** `github.com/msilvano13-coder/eventspace`
**Host:** Vercel (zero-config for Next.js)

To redeploy:
```bash
vercel --prod
```

Or push to `main` — Vercel auto-deploys on push if Git integration is connected.

No environment variables needed.

**Build:** `npm run build` passes cleanly. Output is static + dynamic pages (~88-143KB first-load JS).
