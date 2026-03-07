-- Hotfix: restore write access for admin flows after enabling RLS on level tables
-- Date: 2026-03-07
-- Context: 20260307_public_results_levels_access.sql enabled RLS and created only public SELECT policies,
-- which blocks INSERT/UPDATE/DELETE from authenticated users in AssessmentBuilder.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_levels'
      AND policyname = 'Authenticated write assessment_levels'
  ) THEN
    CREATE POLICY "Authenticated write assessment_levels"
      ON public.assessment_levels
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_level_ranges'
      AND policyname = 'Authenticated write assessment_level_ranges'
  ) THEN
    CREATE POLICY "Authenticated write assessment_level_ranges"
      ON public.assessment_level_ranges
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT INSERT, UPDATE, DELETE ON public.assessment_levels TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assessment_level_ranges TO authenticated;
