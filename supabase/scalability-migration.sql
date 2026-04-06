-- =============================================================================
-- SoiréeSpace Scalability Migration
-- Generated: 2026-03-30
-- Description: Denormalize user_id on high-traffic child tables for O(1) RLS,
--              add composite indexes, and update RLS policies + client portal RPCs
-- =============================================================================

-- =============================================================================
-- PHASE 1: Add user_id columns to 5 highest-traffic child tables
-- =============================================================================

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.floor_plans ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.schedule_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Backfill user_id from parent events table
UPDATE public.guests SET user_id = (SELECT user_id FROM public.events WHERE events.id = guests.event_id) WHERE user_id IS NULL;
UPDATE public.vendors SET user_id = (SELECT user_id FROM public.events WHERE events.id = vendors.event_id) WHERE user_id IS NULL;
UPDATE public.floor_plans SET user_id = (SELECT user_id FROM public.events WHERE events.id = floor_plans.event_id) WHERE user_id IS NULL;
UPDATE public.invoices SET user_id = (SELECT user_id FROM public.events WHERE events.id = invoices.event_id) WHERE user_id IS NULL;
UPDATE public.schedule_items SET user_id = (SELECT user_id FROM public.events WHERE events.id = schedule_items.event_id) WHERE user_id IS NULL;

-- Clean up orphan rows (child rows with no parent event) before NOT NULL constraint
DELETE FROM public.guests WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.vendors WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.floor_plans WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.invoices WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.schedule_items WHERE event_id NOT IN (SELECT id FROM public.events);

-- Set NOT NULL after backfill + orphan cleanup
ALTER TABLE public.guests ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vendors ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.floor_plans ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.schedule_items ALTER COLUMN user_id SET NOT NULL;

-- =============================================================================
-- PHASE 2: Composite indexes for RLS direct user_id checks
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_guests_user_event ON public.guests (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_vendors_user_event ON public.vendors (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_user_event ON public.floor_plans (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_event ON public.invoices (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_user_event ON public.schedule_items (user_id, event_id);

-- =============================================================================
-- PHASE 3: Replace EXISTS-subquery RLS policies with direct user_id checks
-- =============================================================================

-- ── GUESTS ──
DROP POLICY IF EXISTS "Users can view guests for their events" ON public.guests;
DROP POLICY IF EXISTS "Users can insert guests for their events" ON public.guests;
DROP POLICY IF EXISTS "Users can update guests for their events" ON public.guests;
DROP POLICY IF EXISTS "Users can delete guests for their events" ON public.guests;

CREATE POLICY "Users can view guests for their events"
  ON public.guests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert guests for their events"
  ON public.guests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update guests for their events"
  ON public.guests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete guests for their events"
  ON public.guests FOR DELETE USING (auth.uid() = user_id);

-- ── VENDORS ──
DROP POLICY IF EXISTS "Users can view vendors for their events" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert vendors for their events" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors for their events" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors for their events" ON public.vendors;

CREATE POLICY "Users can view vendors for their events"
  ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert vendors for their events"
  ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update vendors for their events"
  ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete vendors for their events"
  ON public.vendors FOR DELETE USING (auth.uid() = user_id);

-- ── FLOOR PLANS ──
DROP POLICY IF EXISTS "Users can view floor plans for their events" ON public.floor_plans;
DROP POLICY IF EXISTS "Users can insert floor plans for their events" ON public.floor_plans;
DROP POLICY IF EXISTS "Users can update floor plans for their events" ON public.floor_plans;
DROP POLICY IF EXISTS "Users can delete floor plans for their events" ON public.floor_plans;

CREATE POLICY "Users can view floor plans for their events"
  ON public.floor_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert floor plans for their events"
  ON public.floor_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update floor plans for their events"
  ON public.floor_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete floor plans for their events"
  ON public.floor_plans FOR DELETE USING (auth.uid() = user_id);

-- ── INVOICES ──
DROP POLICY IF EXISTS "Users can view invoices for their events" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their events" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices for their events" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices for their events" ON public.invoices;

CREATE POLICY "Users can view invoices for their events"
  ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert invoices for their events"
  ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update invoices for their events"
  ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete invoices for their events"
  ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- ── SCHEDULE ITEMS ──
DROP POLICY IF EXISTS "Users can view schedule items for their events" ON public.schedule_items;
DROP POLICY IF EXISTS "Users can insert schedule items for their events" ON public.schedule_items;
DROP POLICY IF EXISTS "Users can update schedule items for their events" ON public.schedule_items;
DROP POLICY IF EXISTS "Users can delete schedule items for their events" ON public.schedule_items;

CREATE POLICY "Users can view schedule items for their events"
  ON public.schedule_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert schedule items for their events"
  ON public.schedule_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update schedule items for their events"
  ON public.schedule_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete schedule items for their events"
  ON public.schedule_items FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- PHASE 4: Update client portal RPC functions to include user_id on INSERT
-- (These are SECURITY DEFINER and bypass RLS, but must include user_id for NOT NULL)
-- =============================================================================

-- ── client_update_guests: add user_id column ──
CREATE OR REPLACE FUNCTION public.client_update_guests(p_share_token text, p_guests jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id, user_id INTO v_event_id, v_user_id FROM events WHERE share_token = p_share_token;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  DELETE FROM guests WHERE event_id = v_event_id;

  IF jsonb_array_length(p_guests) > 0 THEN
    INSERT INTO guests (id, event_id, user_id, name, email, rsvp, meal_choice, table_assignment, plus_one, plus_one_name, dietary_notes, guest_group, vip)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      v_user_id,
      COALESCE(elem->>'name', ''),
      COALESCE(elem->>'email', ''),
      COALESCE(elem->>'rsvp', 'pending'),
      COALESCE(elem->>'meal_choice', ''),
      COALESCE(elem->>'table_assignment', ''),
      COALESCE((elem->>'plus_one')::boolean, false),
      COALESCE(elem->>'plus_one_name', ''),
      COALESCE(elem->>'dietary_notes', ''),
      COALESCE(elem->>'guest_group', ''),
      COALESCE((elem->>'vip')::boolean, false)
    FROM jsonb_array_elements(p_guests) AS elem;
  END IF;
END;
$$;

-- ── client_update_schedule: add user_id column ──
CREATE OR REPLACE FUNCTION public.client_update_schedule(p_share_token text, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id, user_id INTO v_event_id, v_user_id FROM events WHERE share_token = p_share_token;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  DELETE FROM schedule_items WHERE event_id = v_event_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO schedule_items (id, event_id, user_id, time, title, notes)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      v_event_id,
      v_user_id,
      COALESCE(elem->>'time', ''),
      COALESCE(elem->>'title', ''),
      COALESCE(elem->>'notes', '')
    FROM jsonb_array_elements(p_items) AS elem;
  END IF;
END;
$$;

-- =============================================================================
-- PHASE 5: Also optimize vendor_payments RLS (2-hop JOIN -> 1-hop via user_id on vendors)
-- Now that vendors has user_id, vendor_payments can use a simpler EXISTS
-- =============================================================================

DROP POLICY IF EXISTS "Users can view vendor payments for their vendors" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can insert vendor payments for their vendors" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can update vendor payments for their vendors" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can delete vendor payments for their vendors" ON public.vendor_payments;

CREATE POLICY "Users can view vendor payments for their vendors"
  ON public.vendor_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_payments.vendor_id AND vendors.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert vendor payments for their vendors"
  ON public.vendor_payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_payments.vendor_id AND vendors.user_id = auth.uid()
  ));
CREATE POLICY "Users can update vendor payments for their vendors"
  ON public.vendor_payments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_payments.vendor_id AND vendors.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete vendor payments for their vendors"
  ON public.vendor_payments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_payments.vendor_id AND vendors.user_id = auth.uid()
  ));

-- Similarly optimize invoice_line_items RLS (2-hop -> 1-hop via user_id on invoices)
DROP POLICY IF EXISTS "Users can view invoice line items for their invoices" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can insert invoice line items for their invoices" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can update invoice line items for their invoices" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can delete invoice line items for their invoices" ON public.invoice_line_items;

CREATE POLICY "Users can view invoice line items for their invoices"
  ON public.invoice_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert invoice line items for their invoices"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can update invoice line items for their invoices"
  ON public.invoice_line_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete invoice line items for their invoices"
  ON public.invoice_line_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()
  ));

-- Similarly optimize lighting_zones RLS (2-hop -> 1-hop via user_id on floor_plans)
DROP POLICY IF EXISTS "Users can view lighting zones for their floor plans" ON public.lighting_zones;
DROP POLICY IF EXISTS "Users can insert lighting zones for their floor plans" ON public.lighting_zones;
DROP POLICY IF EXISTS "Users can update lighting zones for their floor plans" ON public.lighting_zones;
DROP POLICY IF EXISTS "Users can delete lighting zones for their floor plans" ON public.lighting_zones;

CREATE POLICY "Users can view lighting zones for their floor plans"
  ON public.lighting_zones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.floor_plans WHERE floor_plans.id = lighting_zones.floor_plan_id AND floor_plans.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert lighting zones for their floor plans"
  ON public.lighting_zones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.floor_plans WHERE floor_plans.id = lighting_zones.floor_plan_id AND floor_plans.user_id = auth.uid()
  ));
CREATE POLICY "Users can update lighting zones for their floor plans"
  ON public.lighting_zones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.floor_plans WHERE floor_plans.id = lighting_zones.floor_plan_id AND floor_plans.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete lighting zones for their floor plans"
  ON public.lighting_zones FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.floor_plans WHERE floor_plans.id = lighting_zones.floor_plan_id AND floor_plans.user_id = auth.uid()
  ));

-- =============================================================================
-- DONE - Scalability Migration
-- =============================================================================
