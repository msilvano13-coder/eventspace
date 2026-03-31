-- =============================================================================
-- Remaining RLS Optimization
-- Denormalize user_id on remaining child tables that still use EXISTS subqueries.
-- Same pattern as scalability-migration.sql but for the 8 remaining tables.
-- =============================================================================

-- ── PHASE 1: Add user_id columns ──

ALTER TABLE public.timeline_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.event_contracts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.shared_files ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.mood_board_images ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.discovered_vendors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- ── PHASE 2: Backfill from parent events table ──

UPDATE public.timeline_items SET user_id = (SELECT user_id FROM public.events WHERE events.id = timeline_items.event_id) WHERE user_id IS NULL;
UPDATE public.expenses SET user_id = (SELECT user_id FROM public.events WHERE events.id = expenses.event_id) WHERE user_id IS NULL;
UPDATE public.budget_items SET user_id = (SELECT user_id FROM public.events WHERE events.id = budget_items.event_id) WHERE user_id IS NULL;
UPDATE public.event_contracts SET user_id = (SELECT user_id FROM public.events WHERE events.id = event_contracts.event_id) WHERE user_id IS NULL;
UPDATE public.shared_files SET user_id = (SELECT user_id FROM public.events WHERE events.id = shared_files.event_id) WHERE user_id IS NULL;
UPDATE public.mood_board_images SET user_id = (SELECT user_id FROM public.events WHERE events.id = mood_board_images.event_id) WHERE user_id IS NULL;
UPDATE public.messages SET user_id = (SELECT user_id FROM public.events WHERE events.id = messages.event_id) WHERE user_id IS NULL;
UPDATE public.discovered_vendors SET user_id = (SELECT user_id FROM public.events WHERE events.id = discovered_vendors.event_id) WHERE user_id IS NULL;

-- ── PHASE 3: Clean up orphans and set NOT NULL ──

DELETE FROM public.timeline_items WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.expenses WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.budget_items WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.event_contracts WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.shared_files WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.mood_board_images WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.messages WHERE event_id NOT IN (SELECT id FROM public.events);
DELETE FROM public.discovered_vendors WHERE event_id NOT IN (SELECT id FROM public.events);

ALTER TABLE public.timeline_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.budget_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.event_contracts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.shared_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.mood_board_images ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.discovered_vendors ALTER COLUMN user_id SET NOT NULL;

-- ── PHASE 4: Composite indexes ──

CREATE INDEX IF NOT EXISTS idx_timeline_items_user_event ON public.timeline_items (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_event ON public.expenses (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_user_event ON public.budget_items (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_contracts_user_event ON public.event_contracts (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_user_event ON public.shared_files (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_mood_board_images_user_event ON public.mood_board_images (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_event ON public.messages (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_discovered_vendors_user_event ON public.discovered_vendors (user_id, event_id);

-- ── PHASE 5: Replace EXISTS RLS policies with direct user_id checks ──

-- TIMELINE_ITEMS
DROP POLICY IF EXISTS "Users can view timeline items for their events" ON public.timeline_items;
DROP POLICY IF EXISTS "Users can insert timeline items for their events" ON public.timeline_items;
DROP POLICY IF EXISTS "Users can update timeline items for their events" ON public.timeline_items;
DROP POLICY IF EXISTS "Users can delete timeline items for their events" ON public.timeline_items;
CREATE POLICY "Users can view timeline items for their events" ON public.timeline_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert timeline items for their events" ON public.timeline_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update timeline items for their events" ON public.timeline_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete timeline items for their events" ON public.timeline_items FOR DELETE USING (auth.uid() = user_id);

-- EXPENSES
DROP POLICY IF EXISTS "Users can view expenses for their events" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their events" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for their events" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their events" ON public.expenses;
CREATE POLICY "Users can view expenses for their events" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert expenses for their events" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update expenses for their events" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete expenses for their events" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- BUDGET_ITEMS
DROP POLICY IF EXISTS "Users can view budget items for their events" ON public.budget_items;
DROP POLICY IF EXISTS "Users can insert budget items for their events" ON public.budget_items;
DROP POLICY IF EXISTS "Users can update budget items for their events" ON public.budget_items;
DROP POLICY IF EXISTS "Users can delete budget items for their events" ON public.budget_items;
CREATE POLICY "Users can view budget items for their events" ON public.budget_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert budget items for their events" ON public.budget_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update budget items for their events" ON public.budget_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete budget items for their events" ON public.budget_items FOR DELETE USING (auth.uid() = user_id);

-- EVENT_CONTRACTS
DROP POLICY IF EXISTS "Users can view contracts for their events" ON public.event_contracts;
DROP POLICY IF EXISTS "Users can insert contracts for their events" ON public.event_contracts;
DROP POLICY IF EXISTS "Users can update contracts for their events" ON public.event_contracts;
DROP POLICY IF EXISTS "Users can delete contracts for their events" ON public.event_contracts;
CREATE POLICY "Users can view contracts for their events" ON public.event_contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert contracts for their events" ON public.event_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update contracts for their events" ON public.event_contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete contracts for their events" ON public.event_contracts FOR DELETE USING (auth.uid() = user_id);

-- SHARED_FILES
DROP POLICY IF EXISTS "Users can view files for their events" ON public.shared_files;
DROP POLICY IF EXISTS "Users can insert files for their events" ON public.shared_files;
DROP POLICY IF EXISTS "Users can update files for their events" ON public.shared_files;
DROP POLICY IF EXISTS "Users can delete files for their events" ON public.shared_files;
CREATE POLICY "Users can view files for their events" ON public.shared_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert files for their events" ON public.shared_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update files for their events" ON public.shared_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete files for their events" ON public.shared_files FOR DELETE USING (auth.uid() = user_id);

-- MOOD_BOARD_IMAGES
DROP POLICY IF EXISTS "Users can view mood board images for their events" ON public.mood_board_images;
DROP POLICY IF EXISTS "Users can insert mood board images for their events" ON public.mood_board_images;
DROP POLICY IF EXISTS "Users can update mood board images for their events" ON public.mood_board_images;
DROP POLICY IF EXISTS "Users can delete mood board images for their events" ON public.mood_board_images;
CREATE POLICY "Users can view mood board images for their events" ON public.mood_board_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert mood board images for their events" ON public.mood_board_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update mood board images for their events" ON public.mood_board_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete mood board images for their events" ON public.mood_board_images FOR DELETE USING (auth.uid() = user_id);

-- MESSAGES
DROP POLICY IF EXISTS "Users can view messages for their events" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages for their events" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages for their events" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages for their events" ON public.messages;
CREATE POLICY "Users can view messages for their events" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert messages for their events" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update messages for their events" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete messages for their events" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- DISCOVERED_VENDORS
DROP POLICY IF EXISTS "Users can view discovered vendors for their events" ON public.discovered_vendors;
DROP POLICY IF EXISTS "Users can insert discovered vendors for their events" ON public.discovered_vendors;
DROP POLICY IF EXISTS "Users can update discovered vendors for their events" ON public.discovered_vendors;
DROP POLICY IF EXISTS "Users can delete discovered vendors for their events" ON public.discovered_vendors;
CREATE POLICY "Users can view discovered vendors for their events" ON public.discovered_vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert discovered vendors for their events" ON public.discovered_vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update discovered vendors for their events" ON public.discovered_vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete discovered vendors for their events" ON public.discovered_vendors FOR DELETE USING (auth.uid() = user_id);
