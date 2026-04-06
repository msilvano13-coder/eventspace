-- ============================================================
-- Phase 2: Spatial Data Model + Asset Schema
-- SoiréeSpace Floor Plan Engine
-- ============================================================

-- ── 1. Asset Definitions ──
-- Unified catalog replacing FURNITURE_CATALOG (constants.ts) + models-manifest.json

create table if not exists public.asset_definitions (
  id               text primary key,
  name             text not null,
  category         text not null,
  subcategory      text not null default '',

  -- 2D rendering
  shape            text not null default 'rect'
                     check (shape in ('circle', 'rect')),
  default_width    numeric not null,          -- inches
  default_height   numeric not null,          -- inches
  default_radius   numeric,                   -- inches, for circles

  fill_color       text not null default '#f5f0e8',
  stroke_color     text not null default '#c4b5a0',

  -- Capacity
  max_seats        int not null default 0,
  min_seats        int not null default 0,
  seat_spacing     numeric not null default 24,  -- inches between seat centers

  -- Snap points: [{x, y, angle}] in inches relative to center
  snap_points      jsonb not null default '[]'::jsonb,

  -- 3D model
  model_file_path  text,
  model_file_size  bigint,
  model_complexity text check (model_complexity in ('low', 'medium', 'high')),
  model_variants   jsonb not null default '[]'::jsonb,

  -- Physical 3D dimensions (inches)
  physical_width_in   numeric,
  physical_depth_in   numeric,
  physical_height_in  numeric,

  -- Extensibility (vendor, SKU, price, weight, etc.)
  metadata         jsonb not null default '{}'::jsonb,

  source           text not null default 'builtin'
                     check (source in ('builtin', 'model_manifest', 'custom')),
  active           boolean not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_asset_definitions_category
  on public.asset_definitions (category);
create index if not exists idx_asset_definitions_active
  on public.asset_definitions (active) where active = true;

-- Public read, no RLS needed (shared catalog)
alter table public.asset_definitions enable row level security;

create policy "Anyone can read asset definitions"
  on public.asset_definitions for select
  using (true);


-- ── 2. Layout Objects ──
-- Individual placed items on a floor plan (replaces Fabric.js JSON blob)

create table if not exists public.layout_objects (
  id               uuid primary key default gen_random_uuid(),
  floor_plan_id    uuid not null references public.floor_plans (id) on delete cascade,
  asset_id         text not null references public.asset_definitions (id),

  -- Spatial (inches, origin = room top-left)
  position_x       numeric not null default 0,
  position_y       numeric not null default 0,
  rotation         numeric not null default 0,   -- degrees
  scale_x          numeric not null default 1,
  scale_y          numeric not null default 1,

  -- Dimension overrides (null = use asset defaults)
  width_override   numeric,
  height_override  numeric,

  -- Display
  label            text not null default '',

  -- Grouping (table sets: table + chairs share group_id)
  group_id         uuid,
  parent_id        uuid references public.layout_objects (id) on delete cascade,

  -- Table assignment (for seating/guest management)
  table_id         uuid,

  -- Visual overrides
  fill_override    text,
  stroke_override  text,

  -- Tablescape link
  tablescape_id    text,

  -- Extensibility
  metadata         jsonb not null default '{}'::jsonb,

  -- Render order
  z_index          int not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_layout_objects_floor_plan
  on public.layout_objects (floor_plan_id);
create index if not exists idx_layout_objects_group
  on public.layout_objects (group_id) where group_id is not null;
create index if not exists idx_layout_objects_asset
  on public.layout_objects (asset_id);

alter table public.layout_objects enable row level security;

create policy "Users can view their layout objects"
  on public.layout_objects for select
  using (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_objects.floor_plan_id
      and e.user_id = auth.uid()
  ));

create policy "Users can insert layout objects"
  on public.layout_objects for insert
  with check (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_objects.floor_plan_id
      and e.user_id = auth.uid()
  ));

create policy "Users can update layout objects"
  on public.layout_objects for update
  using (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_objects.floor_plan_id
      and e.user_id = auth.uid()
  ));

create policy "Users can delete layout objects"
  on public.layout_objects for delete
  using (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_objects.floor_plan_id
      and e.user_id = auth.uid()
  ));


-- ── 3. Floor Plans Alterations ──
-- Add room shape + canvas dimensions, keep json column for now

alter table public.floor_plans
  add column if not exists room_shape jsonb,
  add column if not exists canvas_width numeric not null default 600,
  add column if not exists canvas_height numeric not null default 400;


-- ── 4. Layout Versions (version history / restore) ──

create table if not exists public.layout_versions (
  id               uuid primary key default gen_random_uuid(),
  floor_plan_id    uuid not null references public.floor_plans (id) on delete cascade,
  version_number   int not null,
  label            text not null default '',
  snapshot         jsonb not null,       -- full array of layout_object rows
  room_shape       jsonb,
  created_at       timestamptz not null default now(),

  unique (floor_plan_id, version_number)
);

create index if not exists idx_layout_versions_floor_plan
  on public.layout_versions (floor_plan_id, version_number desc);

alter table public.layout_versions enable row level security;

create policy "Users can view their layout versions"
  on public.layout_versions for select
  using (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_versions.floor_plan_id
      and e.user_id = auth.uid()
  ));

create policy "Users can insert layout versions"
  on public.layout_versions for insert
  with check (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_versions.floor_plan_id
      and e.user_id = auth.uid()
  ));

create policy "Users can delete layout versions"
  on public.layout_versions for delete
  using (exists (
    select 1 from public.floor_plans fp
      join public.events e on e.id = fp.event_id
    where fp.id = layout_versions.floor_plan_id
      and e.user_id = auth.uid()
  ));
