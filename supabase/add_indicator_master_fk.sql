-- ====================================================================
-- Add indicator_master_id to indicators and enforce FK
-- ====================================================================

-- Add column if not exists
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS indicator_master_id uuid;

-- Backfill from indicators_master using name match
UPDATE public.indicators i
SET indicator_master_id = m.id
FROM public.indicators_master m
WHERE lower(i.name) = lower(m.name)
  AND i.indicator_master_id IS NULL;

-- Add FK constraint (skip if already exists)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.indicators
    ADD CONSTRAINT indicators_indicator_master_id_fkey
    FOREIGN KEY (indicator_master_id)
    REFERENCES public.indicators_master(id)
    ON DELETE RESTRICT;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Constraint already exists, skip
  END;
END $$;

-- Add unique index (skip if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS indicators_unique_master_per_assessment
ON public.indicators (assessment_id, indicator_master_id);
