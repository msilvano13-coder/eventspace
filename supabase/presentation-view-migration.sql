-- Persist 3D viewer settings per floor plan (venue preset, lighting mood, chair style, etc.)
-- These settings are configured by the planner and shown to clients in the presentation view.
ALTER TABLE public.floor_plans ADD COLUMN IF NOT EXISTS view3d_settings jsonb DEFAULT NULL;

-- Layout approval flow — client can approve or request changes from the presentation view.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS layout_approval_status text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS layout_approval_at timestamptz DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS layout_approval_note text DEFAULT NULL;

-- Fix floor_plans SELECT RLS: also allow access when the user owns the parent event.
-- This ensures planners see floor plans created before the user_id column was added,
-- and any plans created by other means (imports, migrations, etc.).
DROP POLICY IF EXISTS "Users can view floor plans for their events" ON public.floor_plans;
CREATE POLICY "Users can view floor plans for their events"
  ON public.floor_plans FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.can_access_event(event_id)
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = floor_plans.event_id AND e.user_id = auth.uid())
  );

-- Also fix UPDATE/DELETE so planners can manage legacy floor plans they own via the event.
DROP POLICY IF EXISTS "Users can update floor plans for their events" ON public.floor_plans;
CREATE POLICY "Users can update floor plans for their events"
  ON public.floor_plans FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = floor_plans.event_id AND e.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete floor plans for their events" ON public.floor_plans;
CREATE POLICY "Users can delete floor plans for their events"
  ON public.floor_plans FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = floor_plans.event_id AND e.user_id = auth.uid())
  );

-- RPC: Client submits layout approval or change request via share token
CREATE OR REPLACE FUNCTION public.client_approve_layout(
  p_share_token text,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE share_token = p_share_token;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  UPDATE events SET
    layout_approval_status = p_status,
    layout_approval_at = now(),
    layout_approval_note = p_note,
    updated_at = now()
  WHERE id = v_event_id;
END;
$$;
