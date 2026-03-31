-- =============================================================================
-- RSVP Self-Service: Guest lookup & update RPCs
-- Guests can search by name and submit their RSVP without authentication.
-- All functions use SECURITY DEFINER to bypass RLS, validated via share_token.
-- =============================================================================

-- 1. Get basic event info for the RSVP page header
CREATE OR REPLACE FUNCTION public.rsvp_get_event_info(p_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'date', e.date,
    'venue', e.venue,
    'client_name', e.client_name
  ) INTO v_result
  FROM events e
  WHERE e.share_token = p_share_token;

  RETURN v_result;
END;
$$;

-- 2. Lookup a guest by name (case-insensitive, trimmed)
-- Returns only the matched guest(s), not the full guest list.
CREATE OR REPLACE FUNCTION public.rsvp_lookup_guest(
  p_share_token text,
  p_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_results jsonb;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE share_token = p_share_token;
  IF v_event_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'email', g.email,
    'rsvp', g.rsvp,
    'meal_choice', g.meal_choice,
    'dietary_notes', g.dietary_notes,
    'plus_one', g.plus_one,
    'plus_one_name', g.plus_one_name
  ))
  INTO v_results
  FROM guests g
  WHERE g.event_id = v_event_id
    AND lower(trim(g.name)) = lower(trim(p_name));

  RETURN v_results;
END;
$$;

-- 3. Update a single guest's RSVP (not the dangerous delete-all pattern)
CREATE OR REPLACE FUNCTION public.rsvp_update_guest(
  p_share_token text,
  p_guest_id uuid,
  p_rsvp text,
  p_meal_choice text DEFAULT '',
  p_dietary_notes text DEFAULT '',
  p_plus_one_name text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_updated int;
BEGIN
  -- Verify share token → event
  SELECT id INTO v_event_id FROM events WHERE share_token = p_share_token;
  IF v_event_id IS NULL THEN
    RETURN false;
  END IF;

  -- Validate RSVP status
  IF p_rsvp NOT IN ('pending', 'accepted', 'declined') THEN
    RETURN false;
  END IF;

  -- Update only this guest, verified by event_id to prevent cross-event access
  UPDATE guests
  SET
    rsvp = p_rsvp,
    meal_choice = p_meal_choice,
    dietary_notes = p_dietary_notes,
    plus_one = (p_plus_one_name IS NOT NULL AND trim(p_plus_one_name) <> ''),
    plus_one_name = CASE
      WHEN p_plus_one_name IS NOT NULL AND trim(p_plus_one_name) <> ''
      THEN trim(p_plus_one_name)
      ELSE ''
    END
  WHERE id = p_guest_id
    AND event_id = v_event_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;
