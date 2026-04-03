-- Add share_token to events (auto-generated UUID for each event)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS share_token text
  UNIQUE
  DEFAULT replace(gen_random_uuid()::text, '-', '');

-- Backfill existing events that don't have a share_token
UPDATE public.events SET share_token = replace(gen_random_uuid()::text, '-', '') WHERE share_token IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.events ALTER COLUMN share_token SET NOT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_share_token ON public.events (share_token);

-- ════════════════════════════════════════════════════════════════
-- RPC: Fetch full event by share_token (SECURITY DEFINER bypasses RLS)
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_client_event(p_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_result jsonb;
BEGIN
  -- Find the event
  SELECT id INTO v_event_id FROM events WHERE share_token = p_share_token;
  IF v_event_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build the full event JSON with all sub-entities
  SELECT jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'date', e.date,
    'venue', e.venue,
    'client_name', e.client_name,
    'client_email', e.client_email,
    'status', e.status,
    'archived_at', e.archived_at,
    'color_palette', e.color_palette,
    'share_token', e.share_token,
    'created_at', e.created_at,
    'updated_at', e.updated_at,
    'guests', COALESCE((SELECT jsonb_agg(row_to_json(g)) FROM guests g WHERE g.event_id = v_event_id), '[]'::jsonb),
    'timeline_items', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM timeline_items t WHERE t.event_id = v_event_id), '[]'::jsonb),
    'schedule_items', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM schedule_items s WHERE s.event_id = v_event_id), '[]'::jsonb),
    'vendors', COALESCE((
      SELECT jsonb_agg(
        row_to_json(v)::jsonb || jsonb_build_object(
          'vendor_payments', COALESCE((SELECT jsonb_agg(row_to_json(vp)) FROM vendor_payments vp WHERE vp.vendor_id = v.id), '[]'::jsonb)
        )
      ) FROM vendors v WHERE v.event_id = v_event_id
    ), '[]'::jsonb),
    'floor_plans', COALESCE((
      SELECT jsonb_agg(
        row_to_json(fp)::jsonb || jsonb_build_object(
          'lighting_zones', COALESCE((SELECT jsonb_agg(row_to_json(lz)) FROM lighting_zones lz WHERE lz.floor_plan_id = fp.id), '[]'::jsonb),
          'layout_objects', COALESCE((SELECT jsonb_agg(row_to_json(lo)) FROM layout_objects lo WHERE lo.floor_plan_id = fp.id), '[]'::jsonb)
        )
      ) FROM floor_plans fp WHERE fp.event_id = v_event_id
    ), '[]'::jsonb),
    'tablescapes', COALESCE((
      SELECT jsonb_agg(
        row_to_json(ts)::jsonb || jsonb_build_object(
          'tablescape_items', COALESCE((SELECT jsonb_agg(row_to_json(ti)) FROM tablescape_items ti WHERE ti.tablescape_id = ts.id), '[]'::jsonb)
        )
      ) FROM tablescapes ts WHERE ts.event_id = v_event_id
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(
        row_to_json(i)::jsonb || jsonb_build_object(
          'invoice_line_items', COALESCE((SELECT jsonb_agg(row_to_json(ili)) FROM invoice_line_items ili WHERE ili.invoice_id = i.id), '[]'::jsonb)
        )
      ) FROM invoices i WHERE i.event_id = v_event_id
    ), '[]'::jsonb),
    'expenses', COALESCE((SELECT jsonb_agg(row_to_json(ex)) FROM expenses ex WHERE ex.event_id = v_event_id), '[]'::jsonb),
    'budget_items', COALESCE((SELECT jsonb_agg(row_to_json(bi)) FROM budget_items bi WHERE bi.event_id = v_event_id), '[]'::jsonb),
    'event_contracts', COALESCE((SELECT jsonb_agg(row_to_json(ec)) FROM event_contracts ec WHERE ec.event_id = v_event_id), '[]'::jsonb),
    'shared_files', COALESCE((SELECT jsonb_agg(row_to_json(sf)) FROM shared_files sf WHERE sf.event_id = v_event_id), '[]'::jsonb),
    'mood_board_images', COALESCE((SELECT jsonb_agg(row_to_json(mb)) FROM mood_board_images mb WHERE mb.event_id = v_event_id), '[]'::jsonb),
    'messages', COALESCE((SELECT jsonb_agg(row_to_json(m)) FROM messages m WHERE m.event_id = v_event_id), '[]'::jsonb),
    'discovered_vendors', COALESCE((SELECT jsonb_agg(row_to_json(dv)) FROM discovered_vendors dv WHERE dv.event_id = v_event_id), '[]'::jsonb),
    'questionnaire_assignments', COALESCE((SELECT jsonb_agg(row_to_json(qa)) FROM questionnaire_assignments qa WHERE qa.event_id = v_event_id), '[]'::jsonb)
  ) INTO v_result
  FROM events e
  WHERE e.id = v_event_id;

  RETURN v_result;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: Update sub-entity arrays by share_token
-- Accepts a table name and new data, replaces all records
-- ════════════════════════════════════════════════════════════════

-- Client can update guests (RSVP, meal choice, etc.)
CREATE OR REPLACE FUNCTION public.client_update_guests(p_share_token text, p_guests jsonb)
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

  DELETE FROM guests WHERE event_id = v_event_id;

  IF jsonb_array_length(p_guests) > 0 THEN
    INSERT INTO guests (id, event_id, name, email, rsvp, meal_choice, table_assignment, plus_one, plus_one_name, dietary_notes)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'name', ''),
      COALESCE(elem->>'email', ''),
      COALESCE(elem->>'rsvp', 'pending'),
      COALESCE(elem->>'meal_choice', ''),
      COALESCE(elem->>'table_assignment', ''),
      COALESCE((elem->>'plus_one')::boolean, false),
      COALESCE(elem->>'plus_one_name', ''),
      COALESCE(elem->>'dietary_notes', '')
    FROM jsonb_array_elements(p_guests) AS elem;
  END IF;
END;
$$;

-- Client can update messages
CREATE OR REPLACE FUNCTION public.client_update_messages(p_share_token text, p_messages jsonb)
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

  DELETE FROM messages WHERE event_id = v_event_id;

  IF jsonb_array_length(p_messages) > 0 THEN
    INSERT INTO messages (id, event_id, sender, sender_name, text, created_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'sender', 'client'),
      COALESCE(elem->>'sender_name', ''),
      COALESCE(elem->>'text', ''),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(p_messages) AS elem;
  END IF;
END;
$$;

-- Client can update questionnaire assignments (answers)
CREATE OR REPLACE FUNCTION public.client_update_questionnaire_assignments(p_share_token text, p_assignments jsonb)
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

  DELETE FROM questionnaire_assignments WHERE event_id = v_event_id;

  IF jsonb_array_length(p_assignments) > 0 THEN
    INSERT INTO questionnaire_assignments (id, event_id, questionnaire_id, questionnaire_name, answers, completed_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      (elem->>'questionnaire_id')::uuid,
      COALESCE(elem->>'questionnaire_name', ''),
      COALESCE((elem->'answers')::jsonb, '{}'::jsonb),
      (elem->>'completed_at')::timestamptz
    FROM jsonb_array_elements(p_assignments) AS elem;
  END IF;
END;
$$;

-- Client can update event contracts (signatures)
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
      client_signature, client_signed_at, client_signed_name, assigned_at
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
      COALESCE((elem->>'assigned_at')::timestamptz, now())
    FROM jsonb_array_elements(p_contracts) AS elem;
  END IF;
END;
$$;

-- Client can update shared files
CREATE OR REPLACE FUNCTION public.client_update_files(p_share_token text, p_files jsonb)
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

  DELETE FROM shared_files WHERE event_id = v_event_id;

  IF jsonb_array_length(p_files) > 0 THEN
    INSERT INTO shared_files (id, event_id, name, type, url, uploaded_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'name', ''),
      COALESCE(elem->>'type', 'other'),
      COALESCE(elem->>'url', ''),
      COALESCE((elem->>'uploaded_at')::timestamptz, now())
    FROM jsonb_array_elements(p_files) AS elem;
  END IF;
END;
$$;

-- Client can update mood board images
CREATE OR REPLACE FUNCTION public.client_update_mood_board(p_share_token text, p_images jsonb)
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

  DELETE FROM mood_board_images WHERE event_id = v_event_id;

  IF jsonb_array_length(p_images) > 0 THEN
    INSERT INTO mood_board_images (id, event_id, url, thumb, caption, added_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'url', ''),
      COALESCE(elem->>'thumb', ''),
      COALESCE(elem->>'caption', ''),
      COALESCE((elem->>'added_at')::timestamptz, now())
    FROM jsonb_array_elements(p_images) AS elem;
  END IF;
END;
$$;

-- Client can update timeline (mark items as completed)
CREATE OR REPLACE FUNCTION public.client_update_timeline(p_share_token text, p_items jsonb)
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

  DELETE FROM timeline_items WHERE event_id = v_event_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO timeline_items (id, event_id, title, due_date, completed, sort_order)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'title', ''),
      elem->>'due_date',
      COALESCE((elem->>'completed')::boolean, false),
      COALESCE((elem->>'sort_order')::int, 0)
    FROM jsonb_array_elements(p_items) AS elem;
  END IF;
END;
$$;

-- Client can update schedule
CREATE OR REPLACE FUNCTION public.client_update_schedule(p_share_token text, p_items jsonb)
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

  DELETE FROM schedule_items WHERE event_id = v_event_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO schedule_items (id, event_id, time, title, notes)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'time', ''),
      COALESCE(elem->>'title', ''),
      COALESCE(elem->>'notes', '')
    FROM jsonb_array_elements(p_items) AS elem;
  END IF;
END;
$$;

-- Client can update color palette and other event-level fields
CREATE OR REPLACE FUNCTION public.client_update_event_fields(p_share_token text, p_fields jsonb)
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
    color_palette = COALESCE((p_fields->'color_palette')::jsonb, color_palette),
    updated_at = now()
  WHERE id = v_event_id;
END;
$$;

-- Client can update budget items
CREATE OR REPLACE FUNCTION public.client_update_budget(p_share_token text, p_items jsonb)
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

  DELETE FROM budget_items WHERE event_id = v_event_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO budget_items (id, event_id, category, allocated, notes)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'category', ''),
      COALESCE((elem->>'allocated')::numeric, 0),
      COALESCE(elem->>'notes', '')
    FROM jsonb_array_elements(p_items) AS elem;
  END IF;
END;
$$;

-- Client can update discovered vendors
CREATE OR REPLACE FUNCTION public.client_update_discovered_vendors(p_share_token text, p_vendors jsonb)
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

  DELETE FROM discovered_vendors WHERE event_id = v_event_id;

  IF jsonb_array_length(p_vendors) > 0 THEN
    INSERT INTO discovered_vendors (id, event_id, name, category, rating, review_count, phone, website, address, price_level, google_maps_url, shared_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      COALESCE(elem->>'name', ''),
      COALESCE(elem->>'category', ''),
      COALESCE((elem->>'rating')::numeric, 0),
      COALESCE((elem->>'review_count')::int, 0),
      COALESCE(elem->>'phone', ''),
      COALESCE(elem->>'website', ''),
      COALESCE(elem->>'address', ''),
      COALESCE((elem->>'price_level')::int, 0),
      COALESCE(elem->>'google_maps_url', ''),
      COALESCE((elem->>'shared_at')::timestamptz, now())
    FROM jsonb_array_elements(p_vendors) AS elem;
  END IF;
END;
$$;

-- Helper: get share_token for an event (used by planner to generate client link)
CREATE OR REPLACE FUNCTION public.get_share_token(p_event_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT share_token INTO v_token FROM events WHERE id = p_event_id;
  RETURN v_token;
END;
$$;
