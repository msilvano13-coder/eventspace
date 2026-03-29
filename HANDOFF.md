# EventSpace Handoff — March 28, 2026

## Current State: Production-Ready
All code is committed, pushed, and deploying on Vercel. No pending changes.
- **Latest commit:** `4a839fd` — Fix critical column name mismatch: planner_id → user_id
- **Branch:** `main`
- **Uncommitted files:** Only local docs (ADMIN_MANUAL.md, PDFs, Python scripts) — not part of the app

---

## What Was Done This Session

### 1. Security Audit — All Critical Fixes Deployed
| Fix | File(s) | Commit |
|-----|---------|--------|
| Server-side event creation limit | `src/lib/supabase/db.ts` | `f60b8a2` |
| Path traversal protection on storage APIs | `src/app/api/storage/upload/route.ts`, `signed-url/route.ts` | `f60b8a2` |
| Payment verification for DIY one-time payments | `src/app/api/stripe/verify-session/route.ts` | `f60b8a2` |
| Strip privileged fields from profile updates | `src/lib/supabase/db.ts` (`safeProfileToRow`) | `f60b8a2` |
| DIY users blocked from Pro-only routes (middleware) | `src/lib/supabase/middleware.ts` | `f60b8a2` |
| Open redirect fix on sign-in | `src/app/sign-in/page.tsx` | `f60b8a2` |
| Account deletion: Stripe customer + Storage cleanup | `src/app/api/account/delete/route.ts` | `f60b8a2` |
| Contract template storagePath copy | `src/app/planner/[eventId]/contracts/page.tsx` | `f60b8a2` |

### 2. Mobile Sign-Out Button (`613410b`)
- Added Sign Out to the mobile "More" sheet (was previously missing entirely)

### 3. Critical Column Name Fix (`4a839fd`)
- Database uses `user_id` but code had `planner_id` in 4 places
- **Impact before fix:** Event creation limits never enforced, account deletion left orphaned data
- Fixed in: `db.ts` (event limit query) and `account/delete/route.ts` (3 queries)

---

## Architecture Overview

### Plans & Billing
- **Trial:** 3 active events, full Pro features, time-limited
- **DIY:** 1 active event, $149 one-time payment, limited features (no inquiries/calendar/questionnaires/contracts/finances/reports/preferred vendors)
- **Professional:** 999 events, $49/mo subscription, all features
- **Expired:** 0 events, must upgrade

### Storage (Supabase Storage — S3-backed)
- **3 buckets:** `event-files` (private), `contract-templates` (private), `brand-assets` (public)
- **Path convention:** `{user_id}/{filename}` — RLS scoped by folder prefix
- **Client portal:** Unauthenticated access via API routes (`/api/storage/upload`, `/api/storage/signed-url`) that validate share tokens
- **Migration pattern:** Dual-read (`storagePath` ?? base64 fallback) — old base64 data still works

### Key Security Layers
- Middleware: plan-based route gating, auth checks, trial expiry
- `safeProfileToRow()`: strips `plan`, `trialEndsAt`, Stripe IDs from client updates
- Storage APIs: bucket whitelist, path traversal guards, 10MB limit
- Stripe webhook: handles `invoice.payment_failed` (expires after 8 attempts)
- Account deletion: cascades through Storage files → Stripe → all DB tables → auth user

### Database
- **Column name:** All tables use `user_id` (NOT `planner_id`)
- **23 tables** with full RLS policies
- **SQL migrations applied:** `migration.sql`, `stripe-migration.sql`, `client-portal-migration.sql`, `supabase-storage-migration.sql`
- **No pending SQL migrations**

---

## Known Issues / Future Work

### Should Address Soon
1. **Event creation spinning** — User reported a pinwheel when creating events. Wasn't fully debugged. May be related to floor plan creation or Supabase latency. Test on production.
2. **Webhook idempotency** — No deduplication by Stripe event ID. Could process same event twice if retried. Add `processed_events` table or check before updating.
3. **`<img>` tags and missing alt props** — Build warnings (not errors) on moodboard and client portal pages. Non-blocking but should be cleaned up for accessibility.

### Nice to Have
4. **Image optimization** — Using `<img>` instead of Next.js `<Image>` in moodboard/client portal. Would improve LCP.
5. **Batch delete optimization** — Account deletion does sequential deletes across 20+ tables. Could parallelize with `Promise.all` for groups without FK dependencies.
6. **Storage cleanup on event delete** — When archiving/deleting an event, Storage files for that event aren't cleaned up yet (only on full account deletion).

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Database layer (all CRUD) | `src/lib/supabase/db.ts` |
| Type definitions | `src/lib/types.ts` |
| Plan features & limits | `src/lib/plan-features.ts` |
| Auth middleware | `src/lib/supabase/middleware.ts` |
| Storage utilities | `src/lib/supabase/storage.ts` |
| Stripe webhook | `src/app/api/stripe/webhook/route.ts` |
| Account deletion | `src/app/api/account/delete/route.ts` |
| Client portal storage APIs | `src/app/api/storage/upload/route.ts`, `signed-url/route.ts` |
| Sidebar (desktop + mobile nav) | `src/components/layout/Sidebar.tsx` |
| Planner dashboard | `src/app/planner/page.tsx` |
| Settings (logo, privacy, delete account) | `src/app/planner/settings/page.tsx` |
| Privacy policy | `src/app/privacy/page.tsx` |
| Terms of service | `src/app/terms/page.tsx` |

---

## Environment / Accounts
- **Vercel:** Auto-deploys from `main` branch
- **Supabase:** Project with service role key in `.env.local`
- **Stripe:** Live mode with Smart Retry enabled (8 attempts), email receipts on
- **Test account:** msilvano13@gmail.com (currently on `diy` plan)
- **Contact email (legal pages):** michael@michaelsilvano.com
