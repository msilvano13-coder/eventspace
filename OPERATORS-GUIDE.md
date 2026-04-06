# SoiréeSpace Operator's Guide

A plain-English guide to every backend service SoiréeSpace uses, what it does, and how to manage it.

---

## Table of Contents
1. [Vercel (Hosting)](#1-vercel-hosting)
2. [Supabase (Database, Auth, Storage)](#2-supabase-database-auth-storage)
3. [Stripe (Payments)](#3-stripe-payments)
4. [PostHog (Analytics)](#4-posthog-analytics)
5. [Google Places API (Vendor Discovery)](#5-google-places-api-vendor-discovery)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Common Tasks](#7-common-tasks)

---

## 1. Vercel (Hosting)

**What it is:** Vercel hosts your website. When you push code to GitHub, Vercel automatically builds and deploys it to the internet.

**What it does for SoiréeSpace:**
- Serves your website to users (the HTML, CSS, JavaScript)
- Runs your API routes (the `/api/*` endpoints that talk to Stripe, Supabase, etc.)
- Provides a CDN (Content Delivery Network) so pages load fast worldwide
- Handles SSL certificates (the padlock in the browser)
- Collects basic web analytics (page views, visitors)

**Dashboard:** https://vercel.com/dashboard

### Key things you'll do in Vercel:

**Check deployment status:**
Go to your project > Deployments. Green = live, Red = failed. If a deploy fails, click it to see the build log — the error is usually at the bottom.

**Environment variables:**
Settings > Environment Variables. This is where secrets like API keys live. If you change a secret (like rotating a Stripe key), update it here and redeploy.

**Custom domain:**
Settings > Domains. Add your domain (e.g., `soireespace.com`) and follow the DNS instructions.

**Logs (debugging):**
Logs tab shows real-time API route logs. If something isn't working (payments failing, pages erroring), check here first.

**Costs:**
- Free tier: Hobby (1 project, good for dev)
- Pro ($20/mo): Needed for production (team access, more bandwidth, no "Powered by Vercel" badge)

---

## 2. Supabase (Database, Auth, Storage)

**What it is:** Supabase is your backend — it stores all your data, handles user login, and stores uploaded files. Think of it as three services in one.

**Dashboard:** https://supabase.com/dashboard/project/dhsyfgtephgkzteefrga

### 2A. Database (PostgreSQL)

**What it does:** Stores everything — user profiles, events, vendors, guests, contracts, invoices, messages, mood board references, wedding pages, and more.

**Where to find it:** Table Editor (left sidebar, grid icon)

**Key tables:**
| Table | What's in it |
|-------|-------------|
| `profiles` | Every registered planner — name, email, plan (free/diy/professional), Stripe IDs, brand settings |
| `events` | Every event — name, date, venue, client info, vendors, guests, timeline, budget |
| `timeline_items` | Day-of schedule entries for each event |
| `expenses` | Tracked expenses per event |
| `budget_items` | Budget line items per event |
| `event_contracts` | Contracts with signature data |
| `shared_files` | Files shared between planner and client |
| `mood_board_images` | Mood board image references |
| `messages` | Chat messages between planner and client |
| `discovered_vendors` | Vendors found via Google Places search |
| `inquiries` | Client inquiry submissions |
| `preferred_vendors` | Planner's saved vendor list |
| `contract_templates` | Reusable contract templates |
| `questionnaires` | Client questionnaire forms |
| `stripe_webhook_events` | Deduplication log for Stripe webhooks (prevents double-processing) |
| `rate_limits` | Shared rate limiting across all server instances |

**Row-Level Security (RLS):** Every table has security rules so users can only see their own data. A planner can't see another planner's events. This is enforced at the database level — even if the app code had a bug, the database would block unauthorized access.

**SQL Editor:** Left sidebar > SQL Editor. This is where you run migrations (the SQL files in the `supabase/` folder). You paste the SQL and click "Run."

### 2B. Authentication

**What it does:** Handles user sign-up, sign-in, password reset, and session management. When a user logs in, Supabase creates a secure session token stored in browser cookies.

**Where to find it:** Authentication (left sidebar, person icon)

**What you'll see:**
- **Users tab:** Every registered user with their email, sign-up date, and last sign-in
- **Policies tab:** The RLS rules that protect your data

**Email templates:** Authentication > Email Templates. Supabase sends these automatically:
- Confirmation email (after sign-up)
- Password reset email
- Magic link email (if enabled)

You can customize the text and branding of these emails.

### 2C. Storage

**What it does:** Stores uploaded files — mood board images, contracts, signatures, logos, and shared files.

**Where to find it:** Storage (left sidebar, folder icon)

**Buckets:**
| Bucket | Access | What's in it |
|--------|--------|-------------|
| `event-files` | Private | Mood boards, signed contracts, shared files, signatures — organized by `{userId}/{eventId}/` |
| `contract-templates` | Private | Reusable contract template files per planner |
| `brand-assets` | Public | Business logos uploaded in planner settings |

**Private vs Public:** Private buckets require a signed URL (a temporary link that expires). Public buckets are accessible to anyone with the link. Logos are public so they show on the client portal without auth.

**Storage limits (Free tier):** 1GB total. If you're scaling to many users with lots of image uploads, consider upgrading to Pro (5GB) or adding a cleanup policy for old files.

### Supabase Costs:
- Free: 500MB database, 1GB storage, 50,000 auth users
- Pro ($25/mo): 8GB database, 5GB storage, no project pausing, daily backups

---

## 3. Stripe (Payments)

**What it is:** Stripe processes all payments. Users pay for the DIY or Professional plan through Stripe.

**Dashboard:** https://dashboard.stripe.com

### How payments work in SoiréeSpace:

1. User clicks "Upgrade" on the pricing page
2. Your app creates a **Checkout Session** (a Stripe-hosted payment page)
3. User enters card info on Stripe's page (you never touch card numbers)
4. Stripe processes the payment and sends a **webhook** to your app
5. Your app receives the webhook and upgrades the user's plan in Supabase

### Key Stripe concepts:

**Products & Prices:**
- **DIY Plan** — One-time payment (Price ID: `STRIPE_PRICE_DIY`)
- **Professional Plan** — Monthly subscription (Price ID: `STRIPE_PRICE_PROFESSIONAL`)

Find these at: Products tab in Stripe Dashboard. You can change prices here — the app reads from Stripe, so price changes take effect immediately.

**Webhooks:**
Settings > Webhooks. Your endpoint is `https://yourdomain.com/api/stripe/webhook`. Stripe sends events here when:
- `checkout.session.completed` — Someone paid successfully
- `invoice.payment_succeeded` — Subscription renewed
- `invoice.payment_failed` — Payment failed (card declined, expired)
- `customer.subscription.deleted` — Subscription cancelled

**If webhooks break:** Go to Webhooks in Stripe Dashboard and check the "Attempts" tab. You'll see failed deliveries with error messages. Common fixes: make sure the webhook secret matches, make sure your app is deployed and the endpoint URL is correct.

**Billing Portal:**
Stripe provides a hosted page where users can update their card, view invoices, or cancel. Your app links to this at `/api/stripe/portal`.

**Test vs Live mode:**
Toggle in the top-left of Stripe Dashboard. Use Test mode for development (fake cards like `4242 4242 4242 4242`). Live mode is real money.

### Stripe Costs:
- 2.9% + $0.30 per transaction (standard)
- No monthly fee

---

## 4. PostHog (Analytics)

**What it is:** PostHog tracks how users interact with your app — which pages they visit, which features they use, and where they drop off. Think of it as Google Analytics but specifically for product usage.

**Dashboard:** https://us.posthog.com (sign in with your account)

### What SoiréeSpace tracks:

**Automatic (every page):**
- Page views — which pages users visit and how long they stay
- Page leaves — when users navigate away

**Custom events (specific actions):**
| Event | When it fires | Why it matters |
|-------|--------------|---------------|
| `signup_started` | User begins sign-up | Top of your conversion funnel |
| `signup_completed` | User finishes sign-up | Measures sign-up completion rate |
| `trial_activated` | User starts free trial | Tracks trial adoption |
| `plan_purchased` | User pays for a plan | Revenue conversion |
| `event_created` | User creates a new event | Core engagement metric |
| `floor_plan_opened` | User opens floor plan editor | Feature adoption |
| `contract_signed` | Contract gets signed | Feature usage |
| `client_portal_viewed` | Client opens their portal | Client engagement |
| `blog_viewed` | Someone reads a blog post | Content marketing effectiveness |

### Key things you'll do in PostHog:

**Check conversion funnel:**
Insights > New Insight > Funnel. Set steps like: `signup_started` → `signup_completed` → `trial_activated` → `plan_purchased`. This shows where users drop off.

**See active users:**
Insights > Trends. Select `$pageview` event, break down by day/week. Shows usage over time.

**Session recordings (if enabled):**
PostHog can record user sessions so you can watch exactly how people use your app. Useful for debugging UX issues.

**Feature flags (advanced):**
You can roll out features to a percentage of users. Not currently used but available.

### PostHog Costs:
- Free: 1 million events/month, 15,000 session recordings
- Very generous free tier — likely free for your first 1000 users

---

## 5. Google Places API (Vendor Discovery)

**What it is:** Powers the "Discover Vendors" feature. When a planner searches for "wedding photographer near Austin, TX," this API returns real businesses with ratings, phone numbers, websites, and addresses.

**Console:** https://console.cloud.google.com

### How it works:

1. Planner enters a category (e.g., "catering") and location
2. Your app calls the Google Places Text Search API
3. Results come back with business name, rating, reviews, phone, website, address
4. Results are cached for 7 days (so repeated searches don't cost money)

**Demo mode:** If `GOOGLE_PLACES_API_KEY` is not set, the app shows realistic mock vendor data instead of real results. This is useful for development and demos.

### Managing costs:

Google Places API charges per request:
- Text Search: $0.032 per request
- Your app caches results for 7 days and rate-limits to 20 searches/minute

**Monthly estimate for 1000 users:**
If each user does ~10 vendor searches/month = 10,000 searches = ~$320/month. The 7-day cache significantly reduces this — repeated searches for the same category+location are free.

**To monitor usage:** Google Cloud Console > APIs & Services > Dashboard > Places API (New). Shows request count and costs.

**To set a budget cap:** Google Cloud Console > Billing > Budgets & Alerts. Set a monthly cap (e.g., $100) and get email alerts.

---

## 6. Environment Variables Reference

These are configured in **Vercel > Settings > Environment Variables**. Never put these in code.

| Variable | Service | What it is |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Your project's API URL (safe to expose — "public" prefix means it's in frontend code) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public API key for client-side auth (safe to expose — RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Admin key that bypasses RLS. **Never expose this.** Used server-side only for webhooks and admin operations |
| `STRIPE_SECRET_KEY` | Stripe | Your Stripe API key. **Never expose this.** |
| `STRIPE_PRICE_DIY` | Stripe | Price ID for the DIY plan |
| `STRIPE_PRICE_PROFESSIONAL` | Stripe | Price ID for the Professional plan |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Signs webhook payloads so your app can verify they're really from Stripe |
| `GOOGLE_PLACES_API_KEY` | Google | API key for vendor discovery. Optional — app works in demo mode without it |
| `COOKIE_SECRET` | Security | HMAC secret for signing profile cache cookies in Edge middleware. Generate with: `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | SEO | Your production URL (e.g., `https://soireespace.com`). Used for sitemaps and canonical links |

### Which keys are sensitive?

| Key | If leaked... |
|-----|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Attacker can read/write ALL data in your database, bypassing all security |
| `STRIPE_SECRET_KEY` | Attacker can issue refunds, view customer data, create charges |
| `STRIPE_WEBHOOK_SECRET` | Attacker can forge webhook events (e.g., fake a payment success) |
| `COOKIE_SECRET` | Attacker can forge profile cache cookies to bypass paywall checks |
| `GOOGLE_PLACES_API_KEY` | Attacker can run up your Google Cloud bill |

**If any of these leak:** Rotate immediately in the respective service's dashboard, update in Vercel, and redeploy.

---

## 7. Common Tasks

### "A user says they paid but their account isn't upgraded"

1. **Stripe Dashboard** > Payments > search by email. Confirm payment went through.
2. **Stripe Dashboard** > Webhooks > Recent events. Check if the webhook was delivered successfully.
3. **Supabase** > Table Editor > `profiles` > search by email. Check `plan` column.
4. If the webhook failed, you can manually update the `plan` column in Supabase. Set `plan` to `diy` or `professional` and fill in `stripe_customer_id` and `stripe_subscription_id` from Stripe.

### "The site is down or showing errors"

1. **Vercel** > Deployments. Is the latest deploy green? If red, check the build log.
2. **Vercel** > Logs. Look for runtime errors in API routes.
3. **Supabase** > Reports > API. Check if the database is responding. If it's paused (free tier pauses after 1 week of inactivity), click "Restore."

### "A user wants their account deleted"

The app has a built-in account deletion flow at `/planner/settings`. It:
1. Cancels their Stripe subscription
2. Deletes all their events, files, and storage data
3. Deletes their Supabase auth account

### "I need to run a SQL migration"

1. Open the SQL file from the `supabase/` folder in your code
2. Go to **Supabase** > SQL Editor
3. Paste the SQL and click "Run"
4. Check for "Success" message

### "Google Places searches aren't returning results"

1. Check **Google Cloud Console** > APIs & Services > Credentials. Is the API key active?
2. Check if the Places API (New) is enabled: APIs & Services > Enabled APIs.
3. Check billing — Google requires a billing account even for free tier.
4. The app falls back to mock data if the key is missing or invalid.

### "I want to change pricing"

1. **Stripe Dashboard** > Products. Edit the price on the relevant product.
2. Existing subscribers stay on their current price until you migrate them.
3. New subscribers get the new price immediately.

### "I want to see how many users I have"

- **Total users:** Supabase > Authentication > Users (shows count at top)
- **Active users:** PostHog > Insights > Trends > `$pageview` unique users
- **Paying users:** Stripe > Customers (filter by active subscriptions)
- **Quick SQL:** Supabase SQL Editor > `SELECT plan, count(*) FROM profiles GROUP BY plan;`

---

## Service Status Pages

If something seems broken and it's not your code, check if the service itself is down:

- **Vercel:** https://www.vercelstatus.com
- **Supabase:** https://status.supabase.com
- **Stripe:** https://status.stripe.com
- **PostHog:** https://status.posthog.com
- **Google Cloud:** https://status.cloud.google.com
