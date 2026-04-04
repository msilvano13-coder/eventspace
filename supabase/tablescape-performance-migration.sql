-- =============================================================================
-- Tablescape performance fix: index + RPC for fast item replacement
-- Run this AFTER tablescape-migration.sql AND phase2.5-rls-denormalization.sql
-- =============================================================================

-- 1. Add composite index on tablescapes(id, user_id) so the RLS policy
--    subquery on tablescape_items can do an index-only lookup instead of a
--    sequential scan. This is the root cause of "statement timeout" errors.
CREATE INDEX IF NOT EXISTS idx_tablescapes_id_user_id
  ON public.tablescapes (id, user_id);

-- 2. Create a SECURITY DEFINER function that replaces all tablescape items
--    for a single tablescape in one shot, bypassing per-row RLS evaluation.
--    The function verifies ownership before making changes.
--    Includes user_id column required by phase2.5-rls-denormalization.
CREATE OR REPLACE FUNCTION replace_tablescape_items(
  p_tablescape_id UUID,
  p_user_id UUID,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller owns this tablescape
  IF NOT EXISTS (
    SELECT 1 FROM tablescapes
    WHERE id = p_tablescape_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify tablescape %', p_tablescape_id;
  END IF;

  -- Delete existing items
  DELETE FROM tablescape_items WHERE tablescape_id = p_tablescape_id;

  -- Insert new items from JSONB array (includes user_id for RLS denormalization)
  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO tablescape_items (id, tablescape_id, user_id, asset_id, position_x, position_y, position_z, rotation_y, scale, color_override, sort_order)
    SELECT
      COALESCE((item->>'id')::UUID, gen_random_uuid()),
      p_tablescape_id,
      p_user_id,
      item->>'asset_id',
      COALESCE((item->>'position_x')::NUMERIC, 0),
      COALESCE((item->>'position_y')::NUMERIC, 0),
      COALESCE((item->>'position_z')::NUMERIC, 0),
      COALESCE((item->>'rotation_y')::NUMERIC, 0),
      COALESCE((item->>'scale')::NUMERIC, 1),
      item->>'color_override',
      COALESCE((item->>'sort_order')::INT, row_number() OVER () - 1)
    FROM jsonb_array_elements(p_items) AS item;
  END IF;
END;
$$;
