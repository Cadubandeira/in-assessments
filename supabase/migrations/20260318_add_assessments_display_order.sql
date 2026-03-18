-- Add display_order to assessments table for controlling order in Activities page
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS display_order integer;

-- Populate existing rows with a default order based on creation date
UPDATE public.assessments
SET display_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(published_at, created_at) ASC) AS rn
  FROM public.assessments
) sub
WHERE public.assessments.id = sub.id;

-- Allow admins to update display_order (assessments table should already have an admin policy)
-- No additional RLS needed if existing admin write policy covers all columns.
