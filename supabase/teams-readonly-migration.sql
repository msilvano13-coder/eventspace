-- ============================================================
-- Teams Read-Only Migration
-- Reverts team member write access on all child tables.
-- Team members keep SELECT (read) access only.
-- INSERT/UPDATE/DELETE go back to owner-only (auth.uid() = user_id).
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- DIRECT CHILD TABLES
-- SELECT: keep can_access_event() for team read access
-- INSERT/UPDATE/DELETE: revert to owner-only
-- ══════════════════════════════════════════════════════════════

-- ── GUESTS ──
DROP POLICY IF EXISTS "Users can insert guests for their events" ON public.guests;
DROP POLICY IF EXISTS "Users can update guests for their events" ON public.guests;
DROP POLICY IF EXISTS "Users can delete guests for their events" ON public.guests;

CREATE POLICY "Users can insert guests for their events"
  ON public.guests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update guests for their events"
  ON public.guests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete guests for their events"
  ON public.guests FOR DELETE USING (auth.uid() = user_id);

-- ── VENDORS ──
DROP POLICY IF EXISTS "Users can insert vendors for their events" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors for their events" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors for their events" ON public.vendors;

CREATE POLICY "Users can insert vendors for their events"
  ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update vendors for their events"
  ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete vendors for their events"
  ON public.vendors FOR DELETE USING (auth.uid() = user_id);

-- ── FLOOR PLANS ──
DROP POLICY IF EXISTS "Users can insert floor plans for their events" ON public.floor_plans;
DROP POLICY IF EXISTS "Users can update floor plans for their events" ON public.floor_plans;
DROP POLICY IF EXISTS "Users can delete floor plans for their events" ON public.floor_plans;

CREATE POLICY "Users can insert floor plans for their events"
  ON public.floor_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update floor plans for their events"
  ON public.floor_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete floor plans for their events"
  ON public.floor_plans FOR DELETE USING (auth.uid() = user_id);

-- ── INVOICES ──
DROP POLICY IF EXISTS "Users can insert invoices for their events" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices for their events" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices for their events" ON public.invoices;

CREATE POLICY "Users can insert invoices for their events"
  ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update invoices for their events"
  ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete invoices for their events"
  ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- ── EXPENSES ──
DROP POLICY IF EXISTS "Users can insert expenses for their events" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for their events" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their events" ON public.expenses;

CREATE POLICY "Users can insert expenses for their events"
  ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update expenses for their events"
  ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete expenses for their events"
  ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- ── BUDGET ITEMS ──
DROP POLICY IF EXISTS "Users can insert budget items for their events" ON public.budget_items;
DROP POLICY IF EXISTS "Users can update budget items for their events" ON public.budget_items;
DROP POLICY IF EXISTS "Users can delete budget items for their events" ON public.budget_items;

CREATE POLICY "Users can insert budget items for their events"
  ON public.budget_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update budget items for their events"
  ON public.budget_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete budget items for their events"
  ON public.budget_items FOR DELETE USING (auth.uid() = user_id);

-- ── TIMELINE ITEMS ──
DROP POLICY IF EXISTS "Users can insert timeline items for their events" ON public.timeline_items;
DROP POLICY IF EXISTS "Users can update timeline items for their events" ON public.timeline_items;
DROP POLICY IF EXISTS "Users can delete timeline items for their events" ON public.timeline_items;

CREATE POLICY "Users can insert timeline items for their events"
  ON public.timeline_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update timeline items for their events"
  ON public.timeline_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete timeline items for their events"
  ON public.timeline_items FOR DELETE USING (auth.uid() = user_id);

-- ── SCHEDULE ITEMS ──
DROP POLICY IF EXISTS "Users can insert schedule items for their events" ON public.schedule_items;
DROP POLICY IF EXISTS "Users can update schedule items for their events" ON public.schedule_items;
DROP POLICY IF EXISTS "Users can delete schedule items for their events" ON public.schedule_items;

CREATE POLICY "Users can insert schedule items for their events"
  ON public.schedule_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update schedule items for their events"
  ON public.schedule_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete schedule items for their events"
  ON public.schedule_items FOR DELETE USING (auth.uid() = user_id);

-- ── EVENT CONTRACTS ──
DROP POLICY IF EXISTS "Users can insert event contracts for their events" ON public.event_contracts;
DROP POLICY IF EXISTS "Users can update event contracts for their events" ON public.event_contracts;
DROP POLICY IF EXISTS "Users can delete event contracts for their events" ON public.event_contracts;

CREATE POLICY "Users can insert event contracts for their events"
  ON public.event_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update event contracts for their events"
  ON public.event_contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete event contracts for their events"
  ON public.event_contracts FOR DELETE USING (auth.uid() = user_id);

-- ── SHARED FILES ──
DROP POLICY IF EXISTS "Users can insert shared files for their events" ON public.shared_files;
DROP POLICY IF EXISTS "Users can update shared files for their events" ON public.shared_files;
DROP POLICY IF EXISTS "Users can delete shared files for their events" ON public.shared_files;

CREATE POLICY "Users can insert shared files for their events"
  ON public.shared_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update shared files for their events"
  ON public.shared_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete shared files for their events"
  ON public.shared_files FOR DELETE USING (auth.uid() = user_id);

-- ── MOOD BOARD IMAGES ──
DROP POLICY IF EXISTS "Users can insert mood board images for their events" ON public.mood_board_images;
DROP POLICY IF EXISTS "Users can update mood board images for their events" ON public.mood_board_images;
DROP POLICY IF EXISTS "Users can delete mood board images for their events" ON public.mood_board_images;

CREATE POLICY "Users can insert mood board images for their events"
  ON public.mood_board_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update mood board images for their events"
  ON public.mood_board_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete mood board images for their events"
  ON public.mood_board_images FOR DELETE USING (auth.uid() = user_id);

-- ── MESSAGES ──
DROP POLICY IF EXISTS "Users can insert messages for their events" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages for their events" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages for their events" ON public.messages;

CREATE POLICY "Users can insert messages for their events"
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update messages for their events"
  ON public.messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete messages for their events"
  ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- ── DISCOVERED VENDORS ──
DROP POLICY IF EXISTS "Users can insert discovered vendors for their events" ON public.discovered_vendors;
DROP POLICY IF EXISTS "Users can update discovered vendors for their events" ON public.discovered_vendors;
DROP POLICY IF EXISTS "Users can delete discovered vendors for their events" ON public.discovered_vendors;

CREATE POLICY "Users can insert discovered vendors for their events"
  ON public.discovered_vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update discovered vendors for their events"
  ON public.discovered_vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete discovered vendors for their events"
  ON public.discovered_vendors FOR DELETE USING (auth.uid() = user_id);

-- ── QUESTIONNAIRE ASSIGNMENTS ──
DROP POLICY IF EXISTS "Users can insert questionnaire assignments for their events" ON public.questionnaire_assignments;
DROP POLICY IF EXISTS "Users can update questionnaire assignments for their events" ON public.questionnaire_assignments;
DROP POLICY IF EXISTS "Users can delete questionnaire assignments for their events" ON public.questionnaire_assignments;

CREATE POLICY "Users can insert questionnaire assignments for their events"
  ON public.questionnaire_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid()));
CREATE POLICY "Users can update questionnaire assignments for their events"
  ON public.questionnaire_assignments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid()));
CREATE POLICY "Users can delete questionnaire assignments for their events"
  ON public.questionnaire_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid()));

-- ── GUEST RELATIONSHIPS ──
DROP POLICY IF EXISTS "Users can insert guest_relationships for their events" ON public.guest_relationships;
DROP POLICY IF EXISTS "Users can update guest_relationships for their events" ON public.guest_relationships;
DROP POLICY IF EXISTS "Users can delete guest_relationships for their events" ON public.guest_relationships;

CREATE POLICY "Users can insert guest_relationships for their events"
  ON public.guest_relationships FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid()));
CREATE POLICY "Users can update guest_relationships for their events"
  ON public.guest_relationships FOR UPDATE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid()));
CREATE POLICY "Users can delete guest_relationships for their events"
  ON public.guest_relationships FOR DELETE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════
-- NESTED CHILD TABLES
-- Revert to owner-only for INSERT/UPDATE/DELETE.
-- Helper functions are still used for SELECT, which is fine.
-- ══════════════════════════════════════════════════════════════

-- ── VENDOR PAYMENTS ──
DROP POLICY IF EXISTS "Users can insert vendor payments for their vendors" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can update vendor payments for their vendors" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can delete vendor payments for their vendors" ON public.vendor_payments;

CREATE POLICY "Users can insert vendor payments for their vendors"
  ON public.vendor_payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can update vendor payments for their vendors"
  ON public.vendor_payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can delete vendor payments for their vendors"
  ON public.vendor_payments FOR DELETE
  USING (EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

-- ── INVOICE LINE ITEMS ──
DROP POLICY IF EXISTS "Users can insert invoice line items for their invoices" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can update invoice line items for their invoices" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can delete invoice line items for their invoices" ON public.invoice_line_items;

CREATE POLICY "Users can insert invoice line items for their invoices"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));
CREATE POLICY "Users can update invoice line items for their invoices"
  ON public.invoice_line_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));
CREATE POLICY "Users can delete invoice line items for their invoices"
  ON public.invoice_line_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));

-- ── LIGHTING ZONES ──
DROP POLICY IF EXISTS "Users can insert lighting zones for their floor plans" ON public.lighting_zones;
DROP POLICY IF EXISTS "Users can update lighting zones for their floor plans" ON public.lighting_zones;
DROP POLICY IF EXISTS "Users can delete lighting zones for their floor plans" ON public.lighting_zones;

CREATE POLICY "Users can insert lighting zones for their floor plans"
  ON public.lighting_zones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM floor_plans fp WHERE fp.id = floor_plan_id AND fp.user_id = auth.uid()));
CREATE POLICY "Users can update lighting zones for their floor plans"
  ON public.lighting_zones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM floor_plans fp WHERE fp.id = floor_plan_id AND fp.user_id = auth.uid()));
CREATE POLICY "Users can delete lighting zones for their floor plans"
  ON public.lighting_zones FOR DELETE
  USING (EXISTS (SELECT 1 FROM floor_plans fp WHERE fp.id = floor_plan_id AND fp.user_id = auth.uid()));
