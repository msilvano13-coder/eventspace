-- ============================================================
-- Phase 2.5a: RLS Denormalization for layout_objects,
--             layout_versions, and tablescape_items
-- Matches existing pattern from scalability-migration.sql
-- ============================================================

-- ── 1. Add user_id columns ──

ALTER TABLE public.layout_objects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.layout_versions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.tablescape_items
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);


-- ── 2. Backfill user_id from parent tables ──

-- layout_objects: floor_plans already has user_id (denormalized)
UPDATE public.layout_objects lo
  SET user_id = fp.user_id
  FROM public.floor_plans fp
  WHERE fp.id = lo.floor_plan_id
    AND lo.user_id IS NULL;

-- layout_versions: same parent chain
UPDATE public.layout_versions lv
  SET user_id = fp.user_id
  FROM public.floor_plans fp
  WHERE fp.id = lv.floor_plan_id
    AND lv.user_id IS NULL;

-- tablescape_items: tablescapes already has user_id
UPDATE public.tablescape_items ti
  SET user_id = t.user_id
  FROM public.tablescapes t
  WHERE t.id = ti.tablescape_id
    AND ti.user_id IS NULL;


-- ── 3. Delete orphaned rows ──

DELETE FROM public.layout_objects
  WHERE floor_plan_id NOT IN (SELECT id FROM public.floor_plans);

DELETE FROM public.layout_versions
  WHERE floor_plan_id NOT IN (SELECT id FROM public.floor_plans);

DELETE FROM public.tablescape_items
  WHERE tablescape_id NOT IN (SELECT id FROM public.tablescapes);


-- ── 4. Set NOT NULL ──

ALTER TABLE public.layout_objects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.layout_versions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.tablescape_items ALTER COLUMN user_id SET NOT NULL;


-- ── 5. Create indexes ──

CREATE INDEX IF NOT EXISTS idx_layout_objects_user
  ON public.layout_objects (user_id);
CREATE INDEX IF NOT EXISTS idx_layout_objects_user_floorplan
  ON public.layout_objects (user_id, floor_plan_id);

CREATE INDEX IF NOT EXISTS idx_layout_versions_user
  ON public.layout_versions (user_id);
CREATE INDEX IF NOT EXISTS idx_layout_versions_user_floorplan
  ON public.layout_versions (user_id, floor_plan_id);

CREATE INDEX IF NOT EXISTS idx_tablescape_items_user
  ON public.tablescape_items (user_id);
CREATE INDEX IF NOT EXISTS idx_tablescape_items_user_tablescape
  ON public.tablescape_items (user_id, tablescape_id);


-- ── 6. Replace RLS policies: layout_objects ──
-- Old: 2-hop (floor_plans → events → user_id)
-- New: direct user_id = auth.uid()

DROP POLICY IF EXISTS "Users can view their layout objects" ON public.layout_objects;
DROP POLICY IF EXISTS "Users can insert layout objects" ON public.layout_objects;
DROP POLICY IF EXISTS "Users can update layout objects" ON public.layout_objects;
DROP POLICY IF EXISTS "Users can delete layout objects" ON public.layout_objects;

CREATE POLICY "Users can view their layout objects"
  ON public.layout_objects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert layout objects"
  ON public.layout_objects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update layout objects"
  ON public.layout_objects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete layout objects"
  ON public.layout_objects FOR DELETE
  USING (auth.uid() = user_id);


-- ── 7. Replace RLS policies: layout_versions ──

DROP POLICY IF EXISTS "Users can view their layout versions" ON public.layout_versions;
DROP POLICY IF EXISTS "Users can insert layout versions" ON public.layout_versions;
DROP POLICY IF EXISTS "Users can delete layout versions" ON public.layout_versions;

CREATE POLICY "Users can view their layout versions"
  ON public.layout_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert layout versions"
  ON public.layout_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete layout versions"
  ON public.layout_versions FOR DELETE
  USING (auth.uid() = user_id);


-- ── 8. Replace RLS policies: tablescape_items ──

DROP POLICY IF EXISTS "Users can manage their own tablescape items" ON public.tablescape_items;
DROP POLICY IF EXISTS "Team members can view tablescape items" ON public.tablescape_items;

CREATE POLICY "Users can view their tablescape items"
  ON public.tablescape_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their tablescape items"
  ON public.tablescape_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their tablescape items"
  ON public.tablescape_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their tablescape items"
  ON public.tablescape_items FOR DELETE
  USING (auth.uid() = user_id);

-- Team member view policy (1-hop via tablescapes)
CREATE POLICY "Team members can view tablescape items"
  ON public.tablescape_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tablescapes t
      JOIN public.team_event_assignments tea ON tea.event_id = t.event_id
      JOIN public.team_members tm ON tm.id = tea.member_id
      WHERE t.id = tablescape_items.tablescape_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );
