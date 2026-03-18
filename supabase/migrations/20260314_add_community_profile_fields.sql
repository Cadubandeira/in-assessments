ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS avatar_bg_color text,
  ADD COLUMN IF NOT EXISTS community_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_onboarded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();