-- Migration: Add assessment_schema column to assessment_events
-- Date: 2026-03-04
-- Description: Add schema field to identify if assessment is 'indicadores' or 'niveis'
-- This helps triggers distinguish between indicator-based and level-based assessments

ALTER TABLE public.assessment_events
ADD COLUMN IF NOT EXISTS assessment_schema text DEFAULT 'indicadores'
CHECK (assessment_schema IN ('indicadores', 'niveis'));

COMMENT ON COLUMN public.assessment_events.assessment_schema IS 
  'Schema type of the assessment: "indicadores" (indicator-based) or "niveis" (level-based progression)';

-- This allows triggers to check: 
-- IF NEW.assessment_schema = 'indicadores' THEN insert into user_indicator_history
-- IF NEW.assessment_schema = 'niveis' THEN skip user_indicator_history (or execute different logic)
