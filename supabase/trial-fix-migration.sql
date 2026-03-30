-- =============================================================================
-- Fix: New users should NOT auto-start a 30-day trial
-- Trial is only activated when user explicitly chooses Professional plan
-- DIY users must pay $99 upfront before accessing the planner
-- =============================================================================

-- Remove the automatic 30-day default on trial_ends_at
ALTER TABLE public.profiles ALTER COLUMN trial_ends_at DROP DEFAULT;

-- Update handle_new_user to NOT set trial_ends_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, planner_name, plan)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'trial'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
