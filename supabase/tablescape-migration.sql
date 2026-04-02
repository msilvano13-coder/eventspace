-- Tablescape Designer tables
-- Run this migration in your Supabase SQL editor

-- ── tablescapes (parent) ──
CREATE TABLE IF NOT EXISTS tablescapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT 'Untitled',
  table_shape TEXT NOT NULL DEFAULT 'round',
  table_width NUMERIC NOT NULL DEFAULT 60,
  table_depth NUMERIC NOT NULL DEFAULT 60,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tablescapes_event_id ON tablescapes(event_id);

-- ── tablescape_items (children) ──
CREATE TABLE IF NOT EXISTS tablescape_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablescape_id UUID NOT NULL REFERENCES tablescapes(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  position_z NUMERIC NOT NULL DEFAULT 0,
  rotation_y NUMERIC NOT NULL DEFAULT 0,
  scale NUMERIC NOT NULL DEFAULT 1,
  color_override TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tablescape_items_tablescape_id ON tablescape_items(tablescape_id);

-- ── RLS policies ──
ALTER TABLE tablescapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tablescape_items ENABLE ROW LEVEL SECURITY;

-- Tablescapes: owner can CRUD
CREATE POLICY "Users can manage their own tablescapes"
  ON tablescapes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tablescapes: team members can read
CREATE POLICY "Team members can view tablescapes"
  ON tablescapes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_event_assignments tea
      JOIN team_members tm ON tm.id = tea.member_id
      WHERE tea.event_id = tablescapes.event_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Tablescape items: owner can CRUD via parent
CREATE POLICY "Users can manage their own tablescape items"
  ON tablescape_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tablescapes t
      WHERE t.id = tablescape_items.tablescape_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tablescapes t
      WHERE t.id = tablescape_items.tablescape_id
        AND t.user_id = auth.uid()
    )
  );

-- Tablescape items: team members can read via parent
CREATE POLICY "Team members can view tablescape items"
  ON tablescape_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tablescapes t
      JOIN team_event_assignments tea ON tea.event_id = t.event_id
      JOIN team_members tm ON tm.id = tea.member_id
      WHERE t.id = tablescape_items.tablescape_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );
