-- Migration: Add final_reflection to assessment_versions
-- Stores optional final reflection text for each assessment version.

ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS final_reflection text;

COMMENT ON COLUMN public.assessment_versions.final_reflection IS 'Optional final reflection text shown in assessment results.';
