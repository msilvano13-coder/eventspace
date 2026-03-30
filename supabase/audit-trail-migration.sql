-- =============================================================================
-- EventSpace Audit Trail Migration
-- Generated: 2026-03-30
-- Description: Contract audit log for e-signature legal compliance.
--              Follows Session 7 scalability pattern: direct user_id + composite indexes.
-- =============================================================================

-- =============================================================================
-- PHASE 1: Create contract_audit_log table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contract_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contract_id     uuid NOT NULL,
  user_id         uuid REFERENCES auth.users(id),          -- NULL for client (unauthenticated) actions
  actor_type      text NOT NULL CHECK (actor_type IN ('planner', 'client')),
  action          text NOT NULL CHECK (action IN (
    'contract_created',
    'contract_viewed',
    'contract_downloaded',
    'disclosure_accepted',
    'signature_applied',
    'signature_removed',
    'signed_copy_uploaded',
    'contract_deleted'
  )),
  ip_address      inet,
  user_agent      text,
  metadata        jsonb DEFAULT '{}'::jsonb,                -- actor_name, contract_name, etc.
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- PHASE 2: Indexes — optimized for 5,000-user scale
-- =============================================================================

-- Primary query: "show audit log for this contract" (planner views trail)
CREATE INDEX IF NOT EXISTS idx_audit_contract_created
  ON public.contract_audit_log (contract_id, created_at DESC);

-- RLS index: planner fetching their own audit entries
CREATE INDEX IF NOT EXISTS idx_audit_user_event
  ON public.contract_audit_log (user_id, event_id);

-- Query: "all audit activity for an event" (event-level compliance report)
CREATE INDEX IF NOT EXISTS idx_audit_event_created
  ON public.contract_audit_log (event_id, created_at DESC);

-- =============================================================================
-- PHASE 3: RLS policies — direct user_id check (O(1), no subquery)
-- =============================================================================

ALTER TABLE public.contract_audit_log ENABLE ROW LEVEL SECURITY;

-- Planners can read audit entries for their own events
CREATE POLICY "audit_select_owner" ON public.contract_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Planners can also read client audit entries for events they own
CREATE POLICY "audit_select_event_owner" ON public.contract_audit_log
  FOR SELECT USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Planners can insert audit entries for their own events
CREATE POLICY "audit_insert_owner" ON public.contract_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role inserts client audit entries (via API route)
-- No policy needed — service role bypasses RLS

-- =============================================================================
-- PHASE 4: Add disclosure tracking columns to event_contracts
-- =============================================================================

ALTER TABLE public.event_contracts
  ADD COLUMN IF NOT EXISTS planner_disclosure_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS planner_disclosure_ip inet,
  ADD COLUMN IF NOT EXISTS client_disclosure_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_disclosure_ip inet;

-- =============================================================================
-- PHASE 5: Update client_update_contracts RPC to include disclosure columns
-- =============================================================================

CREATE OR REPLACE FUNCTION public.client_update_contracts(p_share_token text, p_contracts jsonb)
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

  DELETE FROM event_contracts WHERE event_id = v_event_id;

  IF jsonb_array_length(p_contracts) > 0 THEN
    INSERT INTO event_contracts (
      id, event_id, template_id, name, type, vendor_id, vendor_name,
      file_data, file_name, file_size, signed_file_data, signed_file_name, signed_at,
      planner_signature, planner_signed_at, planner_signed_name,
      client_signature, client_signed_at, client_signed_name, assigned_at,
      storage_path, storage_signed_path, storage_planner_sig, storage_client_sig,
      planner_disclosure_accepted_at, planner_disclosure_ip,
      client_disclosure_accepted_at, client_disclosure_ip
    )
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      (elem->>'template_id')::uuid,
      COALESCE(elem->>'name', ''),
      COALESCE(elem->>'type', 'planner'),
      (elem->>'vendor_id')::uuid,
      elem->>'vendor_name',
      COALESCE(elem->>'file_data', ''),
      COALESCE(elem->>'file_name', ''),
      COALESCE((elem->>'file_size')::int, 0),
      elem->>'signed_file_data',
      elem->>'signed_file_name',
      (elem->>'signed_at')::timestamptz,
      elem->>'planner_signature',
      (elem->>'planner_signed_at')::timestamptz,
      elem->>'planner_signed_name',
      elem->>'client_signature',
      (elem->>'client_signed_at')::timestamptz,
      elem->>'client_signed_name',
      COALESCE((elem->>'assigned_at')::timestamptz, now()),
      elem->>'storage_path',
      elem->>'storage_signed_path',
      elem->>'storage_planner_sig',
      elem->>'storage_client_sig',
      (elem->>'planner_disclosure_accepted_at')::timestamptz,
      (elem->>'planner_disclosure_ip')::inet,
      (elem->>'client_disclosure_accepted_at')::timestamptz,
      (elem->>'client_disclosure_ip')::inet
    FROM jsonb_array_elements(p_contracts) AS elem;
  END IF;
END;
$$;

-- Notify PostgREST to pick up schema changes
NOTIFY pgrst, 'reload schema';
