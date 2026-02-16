-- Add color and icon fields to indicators_master table
ALTER TABLE public.indicators_master
ADD COLUMN color text DEFAULT '#6366F1',
ADD COLUMN icon text DEFAULT 'circle';

-- Update visualization_type to support multiple selections (storing as JSON array)
-- Step 1: Remove the old default first
ALTER TABLE public.assessments
ALTER COLUMN visualization_type DROP DEFAULT;

-- Step 2: Convert the column type from text to jsonb
ALTER TABLE public.assessments
ALTER COLUMN visualization_type TYPE jsonb USING 
  CASE 
    WHEN visualization_type IS NULL THEN '["radar"]'::jsonb
    WHEN visualization_type = '' THEN '["radar"]'::jsonb
    ELSE jsonb_build_array(visualization_type)
  END;

-- Step 3: Set the new default for visualization_type as JSON array
ALTER TABLE public.assessments
ALTER COLUMN visualization_type SET DEFAULT '["radar"]'::jsonb;
