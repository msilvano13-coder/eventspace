-- =============================================================================
-- SoiréeSpace — Stripe Subscription & Trial Tracking
-- =============================================================================

-- Add subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'diy', 'professional', 'expired')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_id text;

-- Set trial_ends_at for existing profiles that don't have it
UPDATE public.profiles
  SET trial_ends_at = created_at + INTERVAL '30 days'
  WHERE trial_ends_at IS NULL;

-- Make trial_ends_at NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN trial_ends_at SET DEFAULT (now() + INTERVAL '30 days');

-- Update handle_new_user to set trial_ends_at on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, planner_name, plan, trial_ends_at)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'trial',
    now() + INTERVAL '30 days'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for quick lookups by stripe_customer_id (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Helper function: check if a user's trial/subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_trial_ends timestamptz;
BEGIN
  SELECT plan, trial_ends_at INTO v_plan, v_trial_ends
  FROM profiles WHERE id = p_user_id;

  IF v_plan = 'diy' OR v_plan = 'professional' THEN
    RETURN true;
  END IF;

  IF v_plan = 'trial' AND v_trial_ends > now() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
