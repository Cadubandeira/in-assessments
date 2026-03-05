-- Migration: Add assessment schema types and levels support
-- Date: 2026-03-03
-- Description: Adds support for two types of assessment schemas:
--   - indicadores: Current multi-indicator structure
--   - niveis: Sequential levels structure (Bronze, Prata, Ouro, Platina)

-- 1. Add schema field to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS schema text NOT NULL DEFAULT 'indicadores' 
CHECK (schema IN ('indicadores', 'niveis'));

-- 2. Add schema field to assessment_versions table
ALTER TABLE public.assessment_versions 
ADD COLUMN IF NOT EXISTS schema text NOT NULL DEFAULT 'indicadores' 
CHECK (schema IN ('indicadores', 'niveis'));

-- 3. Add level_mode field to assessment_versions (for schema='niveis')
ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS level_mode text DEFAULT NULL
CHECK (level_mode IS NULL OR level_mode IN ('single', 'multi'));

-- 4. Add optional elements fields to assessment_versions
ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS pre_assessment_fields jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS result_introduction text DEFAULT NULL;

-- 5. Create assessment_levels table for schema 'niveis'
CREATE TABLE IF NOT EXISTS public.assessment_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_version_id uuid NOT NULL,
  name text NOT NULL, -- Ex: 'Bronze', 'Prata', 'Ouro', 'Platina'
  display_order integer NOT NULL,
  description text,
  acquire_threshold numeric DEFAULT NULL, -- Points needed to acquire this level
  potential_threshold numeric DEFAULT NULL, -- Points needed to show potential for this level
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_levels_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_levels_assessment_version_id_fkey 
    FOREIGN KEY (assessment_version_id) 
    REFERENCES public.assessment_versions(id) 
    ON DELETE CASCADE
);

-- 6. Add level_id to questions table (for schema 'niveis')
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS level_id uuid DEFAULT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'questions_level_id_fkey'
  ) THEN
    ALTER TABLE public.questions
    ADD CONSTRAINT questions_level_id_fkey 
      FOREIGN KEY (level_id) 
      REFERENCES public.assessment_levels(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Add score_target to alternatives table (for schema 'niveis')
-- Distinguishes if score counts toward level achievement or potential
ALTER TABLE public.alternatives
ADD COLUMN IF NOT EXISTS score_target text DEFAULT NULL
CHECK (score_target IS NULL OR score_target IN ('level', 'potential'));

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_levels_version 
  ON public.assessment_levels(assessment_version_id);

CREATE INDEX IF NOT EXISTS idx_questions_level 
  ON public.questions(level_id);

CREATE INDEX IF NOT EXISTS idx_assessments_schema 
  ON public.assessments(schema);

-- 9. Add comments for documentation
COMMENT ON COLUMN public.assessments.schema IS 
  'Schema type: indicadores (multi-indicator) or niveis (sequential levels)';

COMMENT ON COLUMN public.assessment_versions.level_mode IS 
  'For schema=niveis: single (one final level) or multi (independent level acquisition)';

COMMENT ON COLUMN public.assessment_versions.pre_assessment_fields IS 
  'JSON array of custom fields to collect before assessment starts';

COMMENT ON COLUMN public.assessment_versions.result_introduction IS 
  'Optional HTML text displayed at the top of results page';

COMMENT ON TABLE public.assessment_levels IS 
  'Levels for schema=niveis assessments (e.g., Bronze, Prata, Ouro, Platina)';

COMMENT ON COLUMN public.assessment_levels.acquire_threshold IS 
  'Minimum points needed to acquire this level (for level_mode=single, highest threshold determines final level)';

COMMENT ON COLUMN public.assessment_levels.potential_threshold IS 
  'Minimum points needed to show potential for this level in results';

COMMENT ON COLUMN public.alternatives.score_target IS 
  'For schema=niveis: level (counts toward acquisition) or potential (indicates future capability)';
