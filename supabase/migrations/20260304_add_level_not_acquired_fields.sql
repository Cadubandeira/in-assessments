-- Migration: Add fields for not acquired level scenarios
-- Date: 2026-03-04
-- Description: Adds fields to show messages when user doesn't acquire levels

-- 1. Add fallback fields to assessment_versions (for level_mode='single')
-- When user doesn't achieve any level in single mode, show this message
ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS no_level_achieved_title text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS no_level_achieved_description text DEFAULT NULL;

-- 2. Add not_acquired fields to assessment_levels (for level_mode='multi')
-- When user doesn't acquire a specific level in multi mode, show this message
ALTER TABLE public.assessment_levels
ADD COLUMN IF NOT EXISTS not_acquired_title text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS not_acquired_description text DEFAULT NULL;

-- 3. Add comments for documentation
COMMENT ON COLUMN public.assessment_versions.no_level_achieved_title IS 
  'For level_mode=single: Title to show when user does not achieve any level';

COMMENT ON COLUMN public.assessment_versions.no_level_achieved_description IS 
  'For level_mode=single: Description to show when user does not achieve any level';

COMMENT ON COLUMN public.assessment_levels.not_acquired_title IS 
  'For level_mode=multi: Title to show when user does not acquire this specific level';

COMMENT ON COLUMN public.assessment_levels.not_acquired_description IS 
  'For level_mode=multi: Description to show when user does not acquire this specific level';
