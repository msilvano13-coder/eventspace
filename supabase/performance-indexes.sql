-- =============================================================================
-- Performance indexes for 1000+ concurrent users
-- Run this after the base migration, stripe-migration, and client-portal-migration
-- =============================================================================

-- profiles.plan — queried on every middleware request for paywall check
create index if not exists idx_profiles_plan on public.profiles (plan);

-- events.archived_at — filtered for active event count enforcement
create index if not exists idx_events_archived_at on public.events (archived_at)
  where archived_at is null;

-- events.share_token — looked up by client portal on every request
create index if not exists idx_events_share_token on public.events (share_token)
  where share_token is not null;

-- events.user_id + archived_at — composite for the common "my active events" query
create index if not exists idx_events_user_active on public.events (user_id, archived_at)
  where archived_at is null;
