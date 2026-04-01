-- ============================================================
-- Teams Migration
-- Adds teams, team_members, team_event_assignments, notifications
-- ============================================================

-- ── Teams table (one per owner) ──
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL CHECK (plan IN ('teams_5', 'teams_10')),
  max_members INT NOT NULL DEFAULT 5,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "teams_owner_all" ON teams
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Helper to check team membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Active team members can read their team
CREATE POLICY "teams_member_select" ON teams
  FOR SELECT USING (
    auth.uid() = owner_id OR public.is_team_member(id)
  );

-- ── Team members table ──
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'coordinator' CHECK (role IN ('coordinator', 'assistant', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  invite_token UUID DEFAULT gen_random_uuid(),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (team_id, email)
);

CREATE INDEX idx_team_members_user ON team_members (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_team_members_token ON team_members (invite_token) WHERE invite_token IS NOT NULL;

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team owner can manage all members
CREATE POLICY "team_members_owner_all" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND t.owner_id = auth.uid()
    )
  );

-- Members can read their own row
CREATE POLICY "team_members_self_select" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- Active members can update their own row
CREATE POLICY "team_members_self_update" ON team_members
  FOR UPDATE USING (user_id = auth.uid() AND status = 'active')
  WITH CHECK (user_id = auth.uid());

-- ── Invite acceptance RPC (bypasses RLS since user_id is NULL for pending invites) ──
CREATE OR REPLACE FUNCTION public.accept_team_invite(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member team_members%ROWTYPE;
  v_team teams%ROWTYPE;
BEGIN
  -- Find pending invite by token
  SELECT * INTO v_member
  FROM team_members
  WHERE invite_token = p_token
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite token');
  END IF;

  -- Check if user is already an active member of this team
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_member.team_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('error', 'Already a member of this team');
  END IF;

  -- Check team still exists
  SELECT * INTO v_team FROM teams WHERE id = v_member.team_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Team no longer exists');
  END IF;

  -- Prevent owner from joining their own team as a member
  IF v_team.owner_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot join your own team as a member');
  END IF;

  -- Accept the invite
  UPDATE team_members
  SET user_id = auth.uid(),
      status = 'active',
      accepted_at = now(),
      invite_token = NULL
  WHERE id = v_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'teamId', v_team.id,
    'teamName', v_team.name,
    'ownerId', v_team.owner_id
  );
END;
$$;

-- ── Team event assignments ──
CREATE TABLE team_event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

CREATE INDEX idx_tea_event ON team_event_assignments (event_id);
CREATE INDEX idx_tea_member ON team_event_assignments (member_id);

ALTER TABLE team_event_assignments ENABLE ROW LEVEL SECURITY;

-- Team owner can manage all assignments
CREATE POLICY "tea_owner_all" ON team_event_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_event_assignments.team_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_event_assignments.team_id
        AND t.owner_id = auth.uid()
    )
  );

-- Assigned members can read their own assignments
CREATE POLICY "tea_member_select" ON team_event_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = team_event_assignments.member_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ── Notifications table ──
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own notifications
CREATE POLICY "notifications_user_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Helper function for team-based event access ──
-- Used by RLS policies on child tables to allow team members
-- to access events they're assigned to
CREATE OR REPLACE FUNCTION public.can_access_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_event_assignments tea
    JOIN team_members tm ON tm.id = tea.member_id
    WHERE tea.event_id = p_event_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;
