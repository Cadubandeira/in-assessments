ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS show_level_badges boolean NOT NULL DEFAULT true;