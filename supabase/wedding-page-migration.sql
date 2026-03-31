-- =============================================================================
-- Wedding Website: New columns on events + public RPC
-- Each event can optionally have a public wedding website page.
-- =============================================================================

-- ── New columns on events ──
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS wedding_page_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wedding_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS wedding_headline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wedding_story text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wedding_hero_storage_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wedding_venue_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wedding_travel_info jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wedding_faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wedding_registry_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wedding_sections_order jsonb NOT NULL DEFAULT '["hero","story","schedule","venue","rsvp","faq","travel","registry"]'::jsonb;

-- Index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_wedding_slug ON public.events (wedding_slug) WHERE wedding_slug IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- RPC: Fetch wedding page data by slug (public, no auth required)
-- Returns only the data needed for the public wedding page.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.wedding_get_page(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_user_id uuid;
  v_result jsonb;
  v_schedule jsonb;
BEGIN
  -- Find the event by slug, must be enabled
  SELECT e.id, e.user_id INTO v_event_id, v_user_id
  FROM events e
  WHERE e.wedding_slug = p_slug
    AND e.wedding_page_enabled = true;

  IF v_event_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch schedule items ordered by time
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'time', s.time,
      'title', s.title,
      'notes', s.notes
    ) ORDER BY s.time
  ), '[]'::jsonb)
  INTO v_schedule
  FROM schedule_items s
  WHERE s.event_id = v_event_id
    AND s.show_on_wedding_page IS NOT FALSE;

  -- Build result (excludes share_token and user_id — these are sensitive and
  -- must never be exposed on the public wedding page)
  SELECT jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'date', e.date,
    'venue', e.venue,
    'headline', e.wedding_headline,
    'story', e.wedding_story,
    'heroStoragePath', e.wedding_hero_storage_path,
    'venueDetails', e.wedding_venue_details,
    'travelInfo', e.wedding_travel_info,
    'faq', e.wedding_faq,
    'registryLinks', e.wedding_registry_links,
    'sectionsOrder', e.wedding_sections_order,
    'schedule', v_schedule,
    'colorPalette', COALESCE(e.color_palette, '[]'::jsonb)
  ) INTO v_result
  FROM events e
  WHERE e.id = v_event_id;

  RETURN v_result;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: RSVP lookup by slug (so we don't need share_token on the URL)
-- Wraps existing RSVP functions but takes slug instead
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.wedding_rsvp_lookup(p_slug text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share_token text;
BEGIN
  SELECT share_token INTO v_share_token
  FROM events
  WHERE wedding_slug = p_slug
    AND wedding_page_enabled = true;

  IF v_share_token IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN rsvp_lookup_guest(v_share_token, p_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.wedding_rsvp_submit(
  p_slug text,
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
  v_share_token text;
BEGIN
  SELECT share_token INTO v_share_token
  FROM events
  WHERE wedding_slug = p_slug
    AND wedding_page_enabled = true;

  IF v_share_token IS NULL THEN
    RETURN false;
  END IF;

  RETURN rsvp_update_guest(v_share_token, p_guest_id, p_rsvp, p_meal_choice, p_dietary_notes, p_plus_one_name);
END;
$$;
