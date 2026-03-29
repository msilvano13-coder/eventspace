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

-- =============================================================================
-- Sub-entity tables queried by event_id (used in .eq("event_id", eventId) calls)
-- =============================================================================

-- timeline_items.event_id — timeline view loads all items for an event
create index if not exists idx_timeline_items_event_id on public.timeline_items (event_id);

-- schedule_items.event_id — schedule/agenda loaded per event
create index if not exists idx_schedule_items_event_id on public.schedule_items (event_id);

-- vendors.event_id — vendor list loaded per event
create index if not exists idx_vendors_event_id on public.vendors (event_id);

-- guests.event_id — guest list loaded per event
create index if not exists idx_guests_event_id on public.guests (event_id);

-- invoices.event_id — invoice list loaded per event
create index if not exists idx_invoices_event_id on public.invoices (event_id);

-- expenses.event_id — expense tracking loaded per event
create index if not exists idx_expenses_event_id on public.expenses (event_id);

-- budget_items.event_id — budget breakdown loaded per event
create index if not exists idx_budget_items_event_id on public.budget_items (event_id);

-- event_contracts.event_id — contracts list loaded per event
create index if not exists idx_event_contracts_event_id on public.event_contracts (event_id);

-- shared_files.event_id — file gallery loaded per event
create index if not exists idx_shared_files_event_id on public.shared_files (event_id);

-- mood_board_images.event_id — mood board loaded per event
create index if not exists idx_mood_board_images_event_id on public.mood_board_images (event_id);

-- messages.event_id — message thread loaded per event
create index if not exists idx_messages_event_id on public.messages (event_id);

-- discovered_vendors.event_id — AI-discovered vendors loaded per event
create index if not exists idx_discovered_vendors_event_id on public.discovered_vendors (event_id);

-- guest_relationships.event_id — guest relationship graph loaded per event
create index if not exists idx_guest_relationships_event_id on public.guest_relationships (event_id);

-- =============================================================================
-- Join-path indexes for child tables reached through a parent filtered by event_id
-- =============================================================================

-- vendor_payments.vendor_id — payments loaded via vendors joined by event_id
create index if not exists idx_vendor_payments_vendor_id on public.vendor_payments (vendor_id);

-- invoice_line_items.invoice_id — line items loaded via invoices joined by event_id
create index if not exists idx_invoice_line_items_invoice_id on public.invoice_line_items (invoice_id);
