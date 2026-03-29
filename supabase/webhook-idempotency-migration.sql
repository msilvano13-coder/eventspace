-- Stripe webhook event deduplication table
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  stripe_event_id   text not null unique,
  event_type        text not null,
  processed_at      timestamptz not null default now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_id ON public.stripe_webhook_events (stripe_event_id);

-- Auto-cleanup: delete events older than 30 days (optional, run via cron)
-- This prevents the table from growing unbounded
COMMENT ON TABLE public.stripe_webhook_events IS 'Tracks processed Stripe webhook events for idempotency. Safe to prune rows older than 30 days.';
