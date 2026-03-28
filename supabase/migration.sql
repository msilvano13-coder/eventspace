-- =============================================================================
-- EventSpace SaaS - Complete Database Migration
-- Generated: 2026-03-28
-- Description: Full schema with RLS policies, indexes, and trigger functions
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Automatically set updated_at on row modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Auto-create a profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- 1. PROFILES (extends auth.users)
-- =============================================================================

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  business_name text not null default '',
  planner_name  text not null default '',
  email         text not null default '',
  phone         text not null default '',
  website       text not null default '',
  logo_url      text not null default '',
  brand_color   text not null default '#e88b8b',
  tagline       text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Extended user profile for event planners; one row per auth.users entry.';

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete using (auth.uid() = id);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Trigger: auto-create profile on sign-up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. EVENTS (per user)
-- =============================================================================

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  date          text not null default '',
  venue         text not null default '',
  client_name   text not null default '',
  client_email  text not null default '',
  status        text not null default 'planning'
                  check (status in ('planning', 'confirmed', 'completed')),
  archived_at   timestamptz,
  color_palette jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.events is 'Core event entity owned by a planner user.';

create index idx_events_user_id on public.events (user_id);

alter table public.events enable row level security;

create policy "Users can view their own events"
  on public.events for select using (auth.uid() = user_id);

create policy "Users can insert their own events"
  on public.events for insert with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on public.events for update using (auth.uid() = user_id);

create policy "Users can delete their own events"
  on public.events for delete using (auth.uid() = user_id);

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 3. FLOOR PLANS (per event)
-- =============================================================================

create table public.floor_plans (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events on delete cascade,
  name       text not null,
  json       text,
  sort_order int not null default 0
);

comment on table public.floor_plans is 'Fabric.js canvas layouts for an event.';

create index idx_floor_plans_event_id on public.floor_plans (event_id);

alter table public.floor_plans enable row level security;

create policy "Users can view floor plans for their events"
  on public.floor_plans for select
  using (exists (
    select 1 from public.events where events.id = floor_plans.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert floor plans for their events"
  on public.floor_plans for insert
  with check (exists (
    select 1 from public.events where events.id = floor_plans.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update floor plans for their events"
  on public.floor_plans for update
  using (exists (
    select 1 from public.events where events.id = floor_plans.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete floor plans for their events"
  on public.floor_plans for delete
  using (exists (
    select 1 from public.events where events.id = floor_plans.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 4. LIGHTING ZONES (per floor_plan, nested via floor_plans -> events)
-- =============================================================================

create table public.lighting_zones (
  id             uuid primary key default gen_random_uuid(),
  floor_plan_id  uuid not null references public.floor_plans on delete cascade,
  name           text not null default '',
  type           text not null default 'uplight'
                   check (type in ('uplight', 'spotlight', 'pinspot', 'gobo', 'wash', 'string', 'candles')),
  color          text not null default '#ffffff',
  intensity      int not null default 75,
  x              numeric not null default 50,
  y              numeric not null default 50,
  size           int not null default 60,
  notes          text not null default ''
);

comment on table public.lighting_zones is 'Lighting configuration zones placed on a floor plan canvas.';

create index idx_lighting_zones_floor_plan_id on public.lighting_zones (floor_plan_id);

alter table public.lighting_zones enable row level security;

create policy "Users can view lighting zones for their floor plans"
  on public.lighting_zones for select
  using (exists (
    select 1 from public.floor_plans
      join public.events on events.id = floor_plans.event_id
    where floor_plans.id = lighting_zones.floor_plan_id
      and events.user_id = auth.uid()
  ));

create policy "Users can insert lighting zones for their floor plans"
  on public.lighting_zones for insert
  with check (exists (
    select 1 from public.floor_plans
      join public.events on events.id = floor_plans.event_id
    where floor_plans.id = lighting_zones.floor_plan_id
      and events.user_id = auth.uid()
  ));

create policy "Users can update lighting zones for their floor plans"
  on public.lighting_zones for update
  using (exists (
    select 1 from public.floor_plans
      join public.events on events.id = floor_plans.event_id
    where floor_plans.id = lighting_zones.floor_plan_id
      and events.user_id = auth.uid()
  ));

create policy "Users can delete lighting zones for their floor plans"
  on public.lighting_zones for delete
  using (exists (
    select 1 from public.floor_plans
      join public.events on events.id = floor_plans.event_id
    where floor_plans.id = lighting_zones.floor_plan_id
      and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 5. TIMELINE ITEMS (planning checklist, per event)
-- =============================================================================

create table public.timeline_items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events on delete cascade,
  title      text not null,
  due_date   text,
  completed  boolean not null default false,
  sort_order int not null default 0
);

comment on table public.timeline_items is 'Planning checklist tasks for an event.';

create index idx_timeline_items_event_id on public.timeline_items (event_id);

alter table public.timeline_items enable row level security;

create policy "Users can view timeline items for their events"
  on public.timeline_items for select
  using (exists (
    select 1 from public.events where events.id = timeline_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert timeline items for their events"
  on public.timeline_items for insert
  with check (exists (
    select 1 from public.events where events.id = timeline_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update timeline items for their events"
  on public.timeline_items for update
  using (exists (
    select 1 from public.events where events.id = timeline_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete timeline items for their events"
  on public.timeline_items for delete
  using (exists (
    select 1 from public.events where events.id = timeline_items.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 6. SCHEDULE ITEMS (day-of timeline, per event)
-- =============================================================================

create table public.schedule_items (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  time     text not null default '',
  title    text not null,
  notes    text not null default ''
);

comment on table public.schedule_items is 'Day-of schedule entries for an event.';

create index idx_schedule_items_event_id on public.schedule_items (event_id);

alter table public.schedule_items enable row level security;

create policy "Users can view schedule items for their events"
  on public.schedule_items for select
  using (exists (
    select 1 from public.events where events.id = schedule_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert schedule items for their events"
  on public.schedule_items for insert
  with check (exists (
    select 1 from public.events where events.id = schedule_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update schedule items for their events"
  on public.schedule_items for update
  using (exists (
    select 1 from public.events where events.id = schedule_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete schedule items for their events"
  on public.schedule_items for delete
  using (exists (
    select 1 from public.events where events.id = schedule_items.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 7. VENDORS (per event)
-- =============================================================================

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events on delete cascade,
  name           text not null,
  category       text not null default 'other',
  contact        text not null default '',
  phone          text not null default '',
  email          text not null default '',
  notes          text not null default '',
  meal_choice    text not null default '',
  contract_total numeric not null default 0
);

comment on table public.vendors is 'Vendors assigned to an event with contract and contact info.';

create index idx_vendors_event_id on public.vendors (event_id);

alter table public.vendors enable row level security;

create policy "Users can view vendors for their events"
  on public.vendors for select
  using (exists (
    select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert vendors for their events"
  on public.vendors for insert
  with check (exists (
    select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update vendors for their events"
  on public.vendors for update
  using (exists (
    select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete vendors for their events"
  on public.vendors for delete
  using (exists (
    select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 8. VENDOR PAYMENTS (per vendor, nested via vendors -> events)
-- =============================================================================

create table public.vendor_payments (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendors on delete cascade,
  description text not null default '',
  amount      numeric not null default 0,
  due_date    text not null default '',
  paid        boolean not null default false,
  paid_date   text
);

comment on table public.vendor_payments is 'Payment schedule and tracking for a vendor contract.';

create index idx_vendor_payments_vendor_id on public.vendor_payments (vendor_id);

alter table public.vendor_payments enable row level security;

create policy "Users can view vendor payments for their vendors"
  on public.vendor_payments for select
  using (exists (
    select 1 from public.vendors
      join public.events on events.id = vendors.event_id
    where vendors.id = vendor_payments.vendor_id
      and events.user_id = auth.uid()
  ));

create policy "Users can insert vendor payments for their vendors"
  on public.vendor_payments for insert
  with check (exists (
    select 1 from public.vendors
      join public.events on events.id = vendors.event_id
    where vendors.id = vendor_payments.vendor_id
      and events.user_id = auth.uid()
  ));

create policy "Users can update vendor payments for their vendors"
  on public.vendor_payments for update
  using (exists (
    select 1 from public.vendors
      join public.events on events.id = vendors.event_id
    where vendors.id = vendor_payments.vendor_id
      and events.user_id = auth.uid()
  ));

create policy "Users can delete vendor payments for their vendors"
  on public.vendor_payments for delete
  using (exists (
    select 1 from public.vendors
      join public.events on events.id = vendors.event_id
    where vendors.id = vendor_payments.vendor_id
      and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 9. GUESTS (per event)
-- =============================================================================

create table public.guests (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events on delete cascade,
  name             text not null,
  email            text not null default '',
  rsvp             text not null default 'pending'
                     check (rsvp in ('pending', 'accepted', 'declined')),
  meal_choice      text not null default '',
  table_assignment text not null default '',
  plus_one         boolean not null default false,
  plus_one_name    text not null default '',
  dietary_notes    text not null default ''
);

comment on table public.guests is 'Guest list with RSVP status, meal preferences, and seating.';

create index idx_guests_event_id on public.guests (event_id);

alter table public.guests enable row level security;

create policy "Users can view guests for their events"
  on public.guests for select
  using (exists (
    select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert guests for their events"
  on public.guests for insert
  with check (exists (
    select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update guests for their events"
  on public.guests for update
  using (exists (
    select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete guests for their events"
  on public.guests for delete
  using (exists (
    select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 10. QUESTIONNAIRES (reusable templates, per user)
-- =============================================================================

create table public.questionnaires (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text not null default '',
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.questionnaires is 'Reusable questionnaire templates owned by a planner.';

create index idx_questionnaires_user_id on public.questionnaires (user_id);

alter table public.questionnaires enable row level security;

create policy "Users can view their own questionnaires"
  on public.questionnaires for select using (auth.uid() = user_id);

create policy "Users can insert their own questionnaires"
  on public.questionnaires for insert with check (auth.uid() = user_id);

create policy "Users can update their own questionnaires"
  on public.questionnaires for update using (auth.uid() = user_id);

create policy "Users can delete their own questionnaires"
  on public.questionnaires for delete using (auth.uid() = user_id);

create trigger set_questionnaires_updated_at
  before update on public.questionnaires
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 11. QUESTIONNAIRE ASSIGNMENTS (per event)
-- =============================================================================

create table public.questionnaire_assignments (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events on delete cascade,
  questionnaire_id   uuid references public.questionnaires on delete set null,
  questionnaire_name text not null default '',
  answers            jsonb not null default '{}'::jsonb,
  completed_at       timestamptz
);

comment on table public.questionnaire_assignments is 'A questionnaire assigned to a specific event with client answers.';

create index idx_questionnaire_assignments_event_id on public.questionnaire_assignments (event_id);
create index idx_questionnaire_assignments_questionnaire_id on public.questionnaire_assignments (questionnaire_id);

alter table public.questionnaire_assignments enable row level security;

create policy "Users can view questionnaire assignments for their events"
  on public.questionnaire_assignments for select
  using (exists (
    select 1 from public.events where events.id = questionnaire_assignments.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert questionnaire assignments for their events"
  on public.questionnaire_assignments for insert
  with check (exists (
    select 1 from public.events where events.id = questionnaire_assignments.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update questionnaire assignments for their events"
  on public.questionnaire_assignments for update
  using (exists (
    select 1 from public.events where events.id = questionnaire_assignments.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete questionnaire assignments for their events"
  on public.questionnaire_assignments for delete
  using (exists (
    select 1 from public.events where events.id = questionnaire_assignments.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 12. INVOICES (per event)
-- =============================================================================

create table public.invoices (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events on delete cascade,
  number     text not null default '',
  status     text not null default 'draft'
               check (status in ('draft', 'sent', 'paid')),
  notes      text not null default '',
  due_date   text,
  created_at timestamptz not null default now()
);

comment on table public.invoices is 'Invoices issued for an event.';

create index idx_invoices_event_id on public.invoices (event_id);

alter table public.invoices enable row level security;

create policy "Users can view invoices for their events"
  on public.invoices for select
  using (exists (
    select 1 from public.events where events.id = invoices.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert invoices for their events"
  on public.invoices for insert
  with check (exists (
    select 1 from public.events where events.id = invoices.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update invoices for their events"
  on public.invoices for update
  using (exists (
    select 1 from public.events where events.id = invoices.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete invoices for their events"
  on public.invoices for delete
  using (exists (
    select 1 from public.events where events.id = invoices.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 13. INVOICE LINE ITEMS (per invoice, nested via invoices -> events)
-- =============================================================================

create table public.invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices on delete cascade,
  description text not null default '',
  quantity    numeric not null default 1,
  unit_price  numeric not null default 0
);

comment on table public.invoice_line_items is 'Individual line items on an invoice.';

create index idx_invoice_line_items_invoice_id on public.invoice_line_items (invoice_id);

alter table public.invoice_line_items enable row level security;

create policy "Users can view invoice line items for their invoices"
  on public.invoice_line_items for select
  using (exists (
    select 1 from public.invoices
      join public.events on events.id = invoices.event_id
    where invoices.id = invoice_line_items.invoice_id
      and events.user_id = auth.uid()
  ));

create policy "Users can insert invoice line items for their invoices"
  on public.invoice_line_items for insert
  with check (exists (
    select 1 from public.invoices
      join public.events on events.id = invoices.event_id
    where invoices.id = invoice_line_items.invoice_id
      and events.user_id = auth.uid()
  ));

create policy "Users can update invoice line items for their invoices"
  on public.invoice_line_items for update
  using (exists (
    select 1 from public.invoices
      join public.events on events.id = invoices.event_id
    where invoices.id = invoice_line_items.invoice_id
      and events.user_id = auth.uid()
  ));

create policy "Users can delete invoice line items for their invoices"
  on public.invoice_line_items for delete
  using (exists (
    select 1 from public.invoices
      join public.events on events.id = invoices.event_id
    where invoices.id = invoice_line_items.invoice_id
      and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 14. EXPENSES (per event)
-- =============================================================================

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events on delete cascade,
  description text not null default '',
  amount      numeric not null default 0,
  category    text not null default '',
  date        text not null default '',
  notes       text not null default ''
);

comment on table public.expenses is 'Tracked expenses for an event.';

create index idx_expenses_event_id on public.expenses (event_id);

alter table public.expenses enable row level security;

create policy "Users can view expenses for their events"
  on public.expenses for select
  using (exists (
    select 1 from public.events where events.id = expenses.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert expenses for their events"
  on public.expenses for insert
  with check (exists (
    select 1 from public.events where events.id = expenses.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update expenses for their events"
  on public.expenses for update
  using (exists (
    select 1 from public.events where events.id = expenses.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete expenses for their events"
  on public.expenses for delete
  using (exists (
    select 1 from public.events where events.id = expenses.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 15. BUDGET ITEMS (per event)
-- =============================================================================

create table public.budget_items (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events on delete cascade,
  category  text not null,
  allocated numeric not null default 0,
  notes     text not null default ''
);

comment on table public.budget_items is 'Budget allocation categories for an event.';

create index idx_budget_items_event_id on public.budget_items (event_id);

alter table public.budget_items enable row level security;

create policy "Users can view budget items for their events"
  on public.budget_items for select
  using (exists (
    select 1 from public.events where events.id = budget_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert budget items for their events"
  on public.budget_items for insert
  with check (exists (
    select 1 from public.events where events.id = budget_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update budget items for their events"
  on public.budget_items for update
  using (exists (
    select 1 from public.events where events.id = budget_items.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete budget items for their events"
  on public.budget_items for delete
  using (exists (
    select 1 from public.events where events.id = budget_items.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 16. EVENT CONTRACTS (per event)
-- =============================================================================

create table public.event_contracts (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references public.events on delete cascade,
  template_id          uuid,
  name                 text not null,
  type                 text not null default 'planner'
                         check (type in ('planner', 'vendor')),
  vendor_id            uuid,
  vendor_name          text,
  file_data            text not null default '',
  file_name            text not null default '',
  file_size            int not null default 0,
  signed_file_data     text,
  signed_file_name     text,
  signed_at            timestamptz,
  planner_signature    text,
  planner_signed_at    timestamptz,
  planner_signed_name  text,
  client_signature     text,
  client_signed_at     timestamptz,
  client_signed_name   text,
  assigned_at          timestamptz not null default now()
);

comment on table public.event_contracts is 'Contracts (planner or vendor) assigned to an event, with signature tracking.';

create index idx_event_contracts_event_id on public.event_contracts (event_id);

alter table public.event_contracts enable row level security;

create policy "Users can view event contracts for their events"
  on public.event_contracts for select
  using (exists (
    select 1 from public.events where events.id = event_contracts.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert event contracts for their events"
  on public.event_contracts for insert
  with check (exists (
    select 1 from public.events where events.id = event_contracts.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update event contracts for their events"
  on public.event_contracts for update
  using (exists (
    select 1 from public.events where events.id = event_contracts.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete event contracts for their events"
  on public.event_contracts for delete
  using (exists (
    select 1 from public.events where events.id = event_contracts.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 17. CONTRACT TEMPLATES (per user, reusable)
-- =============================================================================

create table public.contract_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text not null default '',
  file_data   text not null default '',
  file_name   text not null default '',
  file_size   int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.contract_templates is 'Reusable contract templates owned by a planner.';

create index idx_contract_templates_user_id on public.contract_templates (user_id);

alter table public.contract_templates enable row level security;

create policy "Users can view their own contract templates"
  on public.contract_templates for select using (auth.uid() = user_id);

create policy "Users can insert their own contract templates"
  on public.contract_templates for insert with check (auth.uid() = user_id);

create policy "Users can update their own contract templates"
  on public.contract_templates for update using (auth.uid() = user_id);

create policy "Users can delete their own contract templates"
  on public.contract_templates for delete using (auth.uid() = user_id);

create trigger set_contract_templates_updated_at
  before update on public.contract_templates
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 18. SHARED FILES (per event)
-- =============================================================================

create table public.shared_files (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events on delete cascade,
  name        text not null,
  type        text not null default 'other',
  url         text not null default '',
  uploaded_at timestamptz not null default now()
);

comment on table public.shared_files is 'Files shared within an event (documents, images, etc.).';

create index idx_shared_files_event_id on public.shared_files (event_id);

alter table public.shared_files enable row level security;

create policy "Users can view shared files for their events"
  on public.shared_files for select
  using (exists (
    select 1 from public.events where events.id = shared_files.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert shared files for their events"
  on public.shared_files for insert
  with check (exists (
    select 1 from public.events where events.id = shared_files.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update shared files for their events"
  on public.shared_files for update
  using (exists (
    select 1 from public.events where events.id = shared_files.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete shared files for their events"
  on public.shared_files for delete
  using (exists (
    select 1 from public.events where events.id = shared_files.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 19. MOOD BOARD IMAGES (per event)
-- =============================================================================

create table public.mood_board_images (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  url      text not null default '',
  thumb    text not null default '',
  caption  text not null default '',
  added_at timestamptz not null default now()
);

comment on table public.mood_board_images is 'Inspiration images for an event mood board.';

create index idx_mood_board_images_event_id on public.mood_board_images (event_id);

alter table public.mood_board_images enable row level security;

create policy "Users can view mood board images for their events"
  on public.mood_board_images for select
  using (exists (
    select 1 from public.events where events.id = mood_board_images.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert mood board images for their events"
  on public.mood_board_images for insert
  with check (exists (
    select 1 from public.events where events.id = mood_board_images.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update mood board images for their events"
  on public.mood_board_images for update
  using (exists (
    select 1 from public.events where events.id = mood_board_images.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete mood board images for their events"
  on public.mood_board_images for delete
  using (exists (
    select 1 from public.events where events.id = mood_board_images.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 20. MESSAGES (per event)
-- =============================================================================

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events on delete cascade,
  sender      text not null default 'planner'
                check (sender in ('planner', 'client')),
  sender_name text not null default '',
  text        text not null default '',
  created_at  timestamptz not null default now()
);

comment on table public.messages is 'Chat messages between planner and client within an event.';

create index idx_messages_event_id on public.messages (event_id);

alter table public.messages enable row level security;

create policy "Users can view messages for their events"
  on public.messages for select
  using (exists (
    select 1 from public.events where events.id = messages.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert messages for their events"
  on public.messages for insert
  with check (exists (
    select 1 from public.events where events.id = messages.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update messages for their events"
  on public.messages for update
  using (exists (
    select 1 from public.events where events.id = messages.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete messages for their events"
  on public.messages for delete
  using (exists (
    select 1 from public.events where events.id = messages.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 21. DISCOVERED VENDORS (shared to client portal, per event)
-- =============================================================================

create table public.discovered_vendors (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events on delete cascade,
  name            text not null,
  category        text not null default '',
  rating          numeric not null default 0,
  review_count    int not null default 0,
  phone           text not null default '',
  website         text not null default '',
  address         text not null default '',
  price_level     int not null default 0,
  google_maps_url text not null default '',
  shared_at       timestamptz not null default now()
);

comment on table public.discovered_vendors is 'Vendors discovered and shared with the client via the portal.';

create index idx_discovered_vendors_event_id on public.discovered_vendors (event_id);

alter table public.discovered_vendors enable row level security;

create policy "Users can view discovered vendors for their events"
  on public.discovered_vendors for select
  using (exists (
    select 1 from public.events where events.id = discovered_vendors.event_id and events.user_id = auth.uid()
  ));

create policy "Users can insert discovered vendors for their events"
  on public.discovered_vendors for insert
  with check (exists (
    select 1 from public.events where events.id = discovered_vendors.event_id and events.user_id = auth.uid()
  ));

create policy "Users can update discovered vendors for their events"
  on public.discovered_vendors for update
  using (exists (
    select 1 from public.events where events.id = discovered_vendors.event_id and events.user_id = auth.uid()
  ));

create policy "Users can delete discovered vendors for their events"
  on public.discovered_vendors for delete
  using (exists (
    select 1 from public.events where events.id = discovered_vendors.event_id and events.user_id = auth.uid()
  ));

-- =============================================================================
-- 22. INQUIRIES (per user)
-- =============================================================================

create table public.inquiries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  name             text not null,
  client_name      text not null default '',
  client_email     text not null default '',
  client_phone     text not null default '',
  event_date       text not null default '',
  venue            text not null default '',
  estimated_budget text not null default '',
  notes            text not null default '',
  status           text not null default 'inquiry'
                     check (status in ('inquiry', 'consultation')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.inquiries is 'Incoming client inquiries and consultation requests.';

create index idx_inquiries_user_id on public.inquiries (user_id);

alter table public.inquiries enable row level security;

create policy "Users can view their own inquiries"
  on public.inquiries for select using (auth.uid() = user_id);

create policy "Users can insert their own inquiries"
  on public.inquiries for insert with check (auth.uid() = user_id);

create policy "Users can update their own inquiries"
  on public.inquiries for update using (auth.uid() = user_id);

create policy "Users can delete their own inquiries"
  on public.inquiries for delete using (auth.uid() = user_id);

create trigger set_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 23. PREFERRED VENDORS (per user)
-- =============================================================================

create table public.preferred_vendors (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  name            text not null,
  category        text not null default '',
  rating          numeric not null default 0,
  review_count    int not null default 0,
  phone           text not null default '',
  website         text not null default '',
  address         text not null default '',
  price_level     int not null default 0,
  google_maps_url text not null default '',
  notes           text not null default '',
  added_at        timestamptz not null default now()
);

comment on table public.preferred_vendors is 'Planner''s preferred vendor directory.';

create index idx_preferred_vendors_user_id on public.preferred_vendors (user_id);

alter table public.preferred_vendors enable row level security;

create policy "Users can view their own preferred vendors"
  on public.preferred_vendors for select using (auth.uid() = user_id);

create policy "Users can insert their own preferred vendors"
  on public.preferred_vendors for insert with check (auth.uid() = user_id);

create policy "Users can update their own preferred vendors"
  on public.preferred_vendors for update using (auth.uid() = user_id);

create policy "Users can delete their own preferred vendors"
  on public.preferred_vendors for delete using (auth.uid() = user_id);

-- =============================================================================
-- DONE
-- =============================================================================
