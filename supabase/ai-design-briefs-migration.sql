-- ============================================
-- AI DESIGN BRIEF TABLES
-- ============================================

-- Design projects (the new core entity for AI visualization)
CREATE TABLE IF NOT EXISTS public.design_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name            text NOT NULL DEFAULT '',
  client_name     text NOT NULL DEFAULT '',
  client_email    text NOT NULL DEFAULT '',
  event_date      text NOT NULL DEFAULT '',
  venue_name      text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','generating','complete','archived')),
  share_token     text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Venue photos uploaded by user
CREATE TABLE IF NOT EXISTS public.venue_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.design_projects ON DELETE CASCADE,
  storage_path    text NOT NULL,
  original_name   text NOT NULL DEFAULT '',
  width           int,
  height          int,
  is_primary      boolean NOT NULL DEFAULT false,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Style templates (seeded, planner-curated)
CREATE TABLE IF NOT EXISTS public.style_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        text NOT NULL DEFAULT 'general',
  preview_url     text NOT NULL DEFAULT '',
  color_palette   jsonb NOT NULL DEFAULT '[]',
  prompt_prefix   text NOT NULL DEFAULT '',
  prompt_negative text NOT NULL DEFAULT '',
  controlnet_mode text NOT NULL DEFAULT 'canny',
  strength        real NOT NULL DEFAULT 0.75,
  guidance_scale  real NOT NULL DEFAULT 7.5,
  active          boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Generated images
CREATE TABLE IF NOT EXISTS public.generated_images (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.design_projects ON DELETE CASCADE,
  venue_photo_id  uuid NOT NULL REFERENCES public.venue_photos ON DELETE CASCADE,
  style_id        uuid NOT NULL REFERENCES public.style_templates ON DELETE CASCADE,
  storage_path    text,
  thumbnail_path  text,
  replicate_id    text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','complete','failed')),
  error_message   text,
  prompt_used     text NOT NULL DEFAULT '',
  seed            bigint,
  generation_time_ms int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Design briefs (output document)
CREATE TABLE IF NOT EXISTS public.design_briefs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.design_projects ON DELETE CASCADE,
  title           text NOT NULL DEFAULT '',
  subtitle        text NOT NULL DEFAULT '',
  color_palette   jsonb NOT NULL DEFAULT '[]',
  vendor_categories jsonb NOT NULL DEFAULT '[]',
  notes           text NOT NULL DEFAULT '',
  pdf_storage_path text,
  published       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Brief sections (ordered content blocks)
CREATE TABLE IF NOT EXISTS public.brief_sections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id        uuid NOT NULL REFERENCES public.design_briefs ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('hero','comparison','palette','vendors','notes','gallery')),
  title           text NOT NULL DEFAULT '',
  content         jsonb NOT NULL DEFAULT '{}',
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Generation credits/usage tracking
CREATE TABLE IF NOT EXISTS public.generation_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id      uuid REFERENCES public.design_projects ON DELETE SET NULL,
  credits_used    int NOT NULL DEFAULT 1,
  model_used      text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_usage ENABLE ROW LEVEL SECURITY;

-- Design projects: owner only
CREATE POLICY "design_projects_owner" ON public.design_projects
  FOR ALL USING (auth.uid() = user_id);

-- Venue photos: via project ownership
CREATE POLICY "venue_photos_owner" ON public.venue_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND dp.user_id = auth.uid())
  );

-- Style templates: public read, no write from client
CREATE POLICY "style_templates_read" ON public.style_templates
  FOR SELECT USING (true);

-- Generated images: via project ownership
CREATE POLICY "generated_images_owner" ON public.generated_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND dp.user_id = auth.uid())
  );

-- Design briefs: via project ownership
CREATE POLICY "design_briefs_owner" ON public.design_briefs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND dp.user_id = auth.uid())
  );

-- Brief sections: via brief → project ownership
CREATE POLICY "brief_sections_owner" ON public.brief_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.design_briefs db
      JOIN public.design_projects dp ON dp.id = db.project_id
      WHERE db.id = brief_id AND dp.user_id = auth.uid()
    )
  );

-- Generation usage: owner only
CREATE POLICY "generation_usage_owner" ON public.generation_usage
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_design_projects_user ON public.design_projects (user_id);
CREATE INDEX idx_venue_photos_project ON public.venue_photos (project_id);
CREATE INDEX idx_generated_images_project ON public.generated_images (project_id);
CREATE INDEX idx_design_briefs_project ON public.design_briefs (project_id);
CREATE INDEX idx_brief_sections_brief ON public.brief_sections (brief_id);
CREATE INDEX idx_generation_usage_user ON public.generation_usage (user_id);
CREATE INDEX idx_design_projects_share ON public.design_projects (share_token);

-- Seed initial style templates
INSERT INTO public.style_templates (slug, name, description, category, color_palette, prompt_prefix, prompt_negative, controlnet_mode, strength, guidance_scale, sort_order) VALUES
('moody-editorial', 'Moody Editorial', 'Dark, dramatic tones with rich shadows and warm highlights. Inspired by editorial photography.', 'dramatic', '["#1a1a2e","#16213e","#533535","#c4a35a","#e8d5b7"]', 'moody editorial wedding venue, dramatic shadows, warm golden highlights, rich dark tones, cinematic lighting, intimate atmosphere, fine art photography style', 'cartoon, illustration, bright, overexposed, flat lighting, amateur', 'canny', 0.65, 7.5, 1),
('garden-romantic', 'Garden Romantic', 'Soft pastels, lush greenery, and natural light. A dreamy, organic aesthetic.', 'romantic', '["#f5e6d3","#d4a373","#a8c69f","#588157","#fefae0"]', 'romantic garden wedding venue, soft natural light, lush greenery, pastel flowers, dreamy atmosphere, organic textures, ethereal, golden hour', 'dark, moody, industrial, harsh lighting, artificial', 'canny', 0.70, 7.5, 2),
('modern-minimalist', 'Modern Minimalist', 'Clean lines, neutral palette, architectural elegance. Less is more.', 'modern', '["#ffffff","#f5f5f5","#e0e0e0","#424242","#212121"]', 'modern minimalist wedding venue, clean architectural lines, neutral palette, elegant simplicity, contemporary design, crisp white surfaces, strategic lighting', 'cluttered, rustic, vintage, ornate, busy patterns', 'canny', 0.70, 7.5, 3),
('rustic-warmth', 'Rustic Warmth', 'Warm wood tones, amber lighting, and cozy textures. Barn-chic elegance.', 'rustic', '["#5c3d2e","#8b6914","#d4a574","#f0e6d3","#2d1810"]', 'rustic warm wedding venue, exposed wood beams, amber string lights, cozy textures, warm candlelight, natural materials, barn-chic elegance', 'cold, modern, sterile, neon, industrial metal', 'canny', 0.65, 7.5, 4),
('coastal-breeze', 'Coastal Breeze', 'Ocean-inspired blues, sandy neutrals, and breezy open spaces.', 'natural', '["#e8f4f8","#b8d4e3","#6b9ac4","#2c5f7c","#f5e6d3"]', 'coastal wedding venue, ocean-inspired palette, soft blue tones, sandy neutrals, breezy open atmosphere, natural light, seaside elegance, light and airy', 'dark, enclosed, urban, heavy, gothic', 'canny', 0.70, 7.5, 5),
('glamorous-luxe', 'Glamorous Luxe', 'Gold accents, crystal details, and opulent textures. Black-tie sophistication.', 'glamorous', '["#0d0d0d","#1a1a2e","#c9a96e","#e8d5b7","#ffffff"]', 'glamorous luxury wedding venue, gold accents, crystal chandeliers, opulent textures, black tie sophistication, dramatic uplighting, velvet and marble', 'casual, rustic, outdoor, simple, bohemian', 'canny', 0.65, 7.5, 6),
('bohemian-free', 'Bohemian Free Spirit', 'Earthy tones, macrame, dried flowers, and eclectic layered textures.', 'bohemian', '["#c4a882","#8b7355","#d4a373","#e8ceb0","#6b5b4a"]', 'bohemian wedding venue, earthy tones, macrame details, dried pampas grass, layered textures, eclectic mix, warm and free-spirited, boho-chic', 'formal, structured, modern, minimalist, corporate', 'canny', 0.70, 7.5, 7),
('enchanted-evening', 'Enchanted Evening', 'Twilight purples, fairy lights, and magical woodland atmosphere.', 'dramatic', '["#1a0a2e","#2d1b4e","#6b3fa0","#c4a8e0","#f0e6ff"]', 'enchanted evening wedding venue, twilight purple tones, fairy lights, magical woodland atmosphere, dramatic uplighting, mystical ambiance, starlit canopy', 'bright daylight, stark white, clinical, plain', 'canny', 0.65, 7.5, 8);
