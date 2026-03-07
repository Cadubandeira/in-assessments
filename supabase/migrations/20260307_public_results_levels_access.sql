-- Migration: PublicResults access for level-based assessments
-- Date: 2026-03-07
-- Goal: permitir leitura pública segura de resultados por link sem abrir tabela assessment_events inteira

-- 1) RPC segura para buscar UM resultado público por ID
CREATE OR REPLACE FUNCTION public.get_public_assessment_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', ae.id,
    'assessment_id', ae.assessment_id,
    'assessment_version', ae.assessment_version,
    'user_id', ae.user_id,
    'total_score', ae.total_score,
    'max_possible_score', ae.max_possible_score,
    'classification_snapshot', ae.classification_snapshot,
    'indicator_scores_snapshot', ae.indicator_scores_snapshot,
    'answers_snapshot', ae.answers_snapshot,
    'executed_at', ae.executed_at,
    'created_at', ae.created_at,
    'user_display_name', ae.user_display_name,
    'assessment_version_id', ae.assessment_version_id,
    'activity_type', ae.activity_type,
    'activity_name', ae.activity_name,
    'xp_awarded', ae.xp_awarded,
    'assessment_versions', to_jsonb(av),
    'assessment_info', jsonb_build_object(
      'name', a.name,
      'description', a.description
    )
  )
  FROM public.assessment_events ae
  JOIN public.assessment_versions av ON av.id = ae.assessment_version_id
  JOIN public.assessments a ON a.id = av.assessment_id
  WHERE ae.id = p_event_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_assessment_event(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_assessment_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_assessment_event(UUID) TO anon;

COMMENT ON FUNCTION public.get_public_assessment_event(UUID)
IS 'Retorna dados mínimos do resultado público por ID (link compartilhado), sem exigir SELECT direto em assessment_events.';

-- 2) Leitura pública de metadados de níveis (necessários para compor gráficos/barras no PublicResults)
ALTER TABLE public.assessment_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_level_ranges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_levels'
      AND policyname = 'Public read assessment_levels'
  ) THEN
    CREATE POLICY "Public read assessment_levels"
      ON public.assessment_levels
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_level_ranges'
      AND policyname = 'Public read assessment_level_ranges'
  ) THEN
    CREATE POLICY "Public read assessment_level_ranges"
      ON public.assessment_level_ranges
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

GRANT SELECT ON public.assessment_levels TO anon, authenticated;
GRANT SELECT ON public.assessment_level_ranges TO anon, authenticated;
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT SELECT ON public.alternatives TO anon, authenticated;
