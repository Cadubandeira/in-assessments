-- Migration: Public access to overall ranges for PublicResults via secure RPC
-- Date: 2026-03-11

CREATE OR REPLACE FUNCTION public.get_public_assessment_overall_ranges(p_assessment_version_id UUID)
RETURNS TABLE (
  id UUID,
  assessment_version_id UUID,
  min_score NUMERIC,
  max_score NUMERIC,
  label TEXT,
  interpretation TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    aor.id,
    aor.assessment_version_id,
    aor.min_score,
    aor.max_score,
    aor.label,
    aor.interpretation,
    aor.created_at
  FROM public.assessment_overall_ranges aor
  WHERE aor.assessment_version_id = p_assessment_version_id
  ORDER BY aor.min_score ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_assessment_overall_ranges(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_assessment_overall_ranges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_assessment_overall_ranges(UUID) TO anon;

COMMENT ON FUNCTION public.get_public_assessment_overall_ranges(UUID)
IS 'Retorna ranges globais do assessment version para uso em PublicResults sem SELECT direto na tabela.';
