-- Create a public storage bucket for 3D model assets (GLB files)
-- Run this in your Supabase SQL editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket for static assets)
CREATE POLICY "Public read access for models"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'models');

-- Only authenticated users can upload (you'll use service role key for bulk upload)
CREATE POLICY "Authenticated users can upload models"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'models' AND auth.role() = 'authenticated');
