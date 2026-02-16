-- Remove the unique index that prevents duplicate indicators per assessment
-- This index is no longer needed since we're using assessment_indicators (versioned table)
DROP INDEX IF EXISTS public.indicators_unique_master_per_assessment;
