-- Hotfix: allow authenticated users to read level-based assessment questions/alternatives
-- Date: 2026-03-08
-- Context: users could not answer schema='niveis' assessments because SELECT on questions/alternatives
-- was blocked by RLS for non-admin users.

-- Grants (RLS still enforces row access)
GRANT SELECT ON public.assessment_levels TO authenticated;
GRANT SELECT ON public.questions TO authenticated;
GRANT SELECT ON public.alternatives TO authenticated;

-- Keep RLS enabled explicitly
ALTER TABLE public.assessment_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alternatives ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Read assessment levels from active versions/assessments
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_levels'
      AND policyname = 'Authenticated read active assessment_levels'
  ) THEN
    CREATE POLICY "Authenticated read active assessment_levels"
      ON public.assessment_levels
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessment_versions av
          JOIN public.assessments a ON a.id = av.assessment_id
          WHERE av.id = assessment_levels.assessment_version_id
            AND av.is_active = true
            AND a.is_active = true
        )
      );
  END IF;

  -- Read questions from active assessments for both schemas:
  -- - indicadores: by indicator_id
  -- - niveis: by level_id
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'questions'
      AND policyname = 'Authenticated read questions active assessments'
  ) THEN
    CREATE POLICY "Authenticated read questions active assessments"
      ON public.questions
      FOR SELECT
      TO authenticated
      USING (
        (
          indicator_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.indicators i
            JOIN public.assessments a ON a.id = i.assessment_id
            WHERE i.id = questions.indicator_id
              AND a.is_active = true
          )
        )
        OR
        (
          level_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.assessment_levels l
            JOIN public.assessment_versions av ON av.id = l.assessment_version_id
            JOIN public.assessments a ON a.id = av.assessment_id
            WHERE l.id = questions.level_id
              AND av.is_active = true
              AND a.is_active = true
          )
        )
      );
  END IF;

  -- Read alternatives only when parent question is readable by authenticated users
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alternatives'
      AND policyname = 'Authenticated read alternatives active assessments'
  ) THEN
    CREATE POLICY "Authenticated read alternatives active assessments"
      ON public.alternatives
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.questions q
          WHERE q.id = alternatives.question_id
            AND (
              (
                q.indicator_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM public.indicators i
                  JOIN public.assessments a ON a.id = i.assessment_id
                  WHERE i.id = q.indicator_id
                    AND a.is_active = true
                )
              )
              OR
              (
                q.level_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM public.assessment_levels l
                  JOIN public.assessment_versions av ON av.id = l.assessment_version_id
                  JOIN public.assessments a ON a.id = av.assessment_id
                  WHERE l.id = q.level_id
                    AND av.is_active = true
                    AND a.is_active = true
                )
              )
            )
        )
      );
  END IF;
END $$;
