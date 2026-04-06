-- ============================================================
-- SoiréeSpace: Storage Migration — Add storage path columns
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add storage columns to mood_board_images
ALTER TABLE mood_board_images
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS storage_thumb text;

-- 2. Add storage column to shared_files
ALTER TABLE shared_files
  ADD COLUMN IF NOT EXISTS storage_path text;

-- 3. Add storage columns to event_contracts
ALTER TABLE event_contracts
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS storage_signed_path text,
  ADD COLUMN IF NOT EXISTS storage_planner_sig text,
  ADD COLUMN IF NOT EXISTS storage_client_sig text;

-- 4. Add storage column to contract_templates
ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS storage_path text;

-- 5. Create Storage buckets (run these via Supabase Dashboard > Storage, or use SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-files', 'event-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-templates', 'contract-templates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS Policies

-- event-files: authenticated users can manage their own files
CREATE POLICY "Users can upload event files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own event files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own event files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own event files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- contract-templates: authenticated users can manage their own templates
CREATE POLICY "Users can upload contract templates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own contract templates"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contract-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own contract templates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contract-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own contract templates"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contract-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

-- brand-assets: public read, authenticated write for own files
CREATE POLICY "Anyone can read brand assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

CREATE POLICY "Users can upload own brand assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own brand assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own brand assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Service role bypass: The API routes for client portal use service_role key,
-- which bypasses RLS entirely. No additional policies needed for client portal uploads/downloads.
