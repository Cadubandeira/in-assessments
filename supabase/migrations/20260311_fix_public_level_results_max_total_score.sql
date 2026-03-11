-- Migration: corrigir máximo real dos níveis no RPC de resultados públicos
-- Date: 2026-03-11
-- Goal: expor maxTotalScore por nível considerando o melhor valor possível por pergunta

CREATE OR REPLACE FUNCTION public.get_public_level_results(p_event_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH event_data AS (
  SELECT
    ae.id,
    ae.assessment_version_id,
    ae.answers_snapshot
  FROM public.assessment_events ae
  WHERE ae.id = p_event_id
),
levels_data AS (
  SELECT
    l.id,
    l.name,
    l.description,
    l.display_order,
    l.acquire_threshold
  FROM public.assessment_levels l
  JOIN event_data ed ON ed.assessment_version_id = l.assessment_version_id
),
questions_data AS (
  SELECT
    q.id,
    q.level_id
  FROM public.questions q
  JOIN levels_data ld ON ld.id = q.level_id
),
question_max AS (
  SELECT
    q.id AS question_id,
    q.level_id,
    COALESCE(MAX(CASE WHEN COALESCE(a.score_target, 'level') = 'level' THEN COALESCE(a.score_value, 0) END), 0) AS max_level,
    COALESCE(MAX(CASE WHEN COALESCE(a.score_target, 'level') = 'potential' THEN COALESCE(a.score_value, 0) END), 0) AS max_potential,
    COALESCE(MAX(COALESCE(a.score_value, 0)), 0) AS max_total
  FROM questions_data q
  LEFT JOIN public.alternatives a ON a.question_id = q.id
  GROUP BY q.id, q.level_id
),
answers_data AS (
  SELECT
    q.id AS question_id,
    q.level_id,
    CASE
      WHEN jsonb_typeof(ans.value) = 'object' THEN COALESCE(
        ans.value->>'alternative_id',
        ans.value->>'alternativeId',
        ans.value->>'id',
        ans.value->>'score_value'
      )
      ELSE trim(both '"' from ans.value::text)
    END AS answer_ref
  FROM event_data ed
  JOIN LATERAL jsonb_each(COALESCE(ed.answers_snapshot, '{}'::jsonb)) AS ans(key, value) ON true
  JOIN questions_data q ON q.id::text = ans.key
),
selected_alternatives AS (
  SELECT
    ad.question_id,
    ad.level_id,
    a.id AS alternative_id,
    COALESCE(a.score_value, 0) AS score_value,
    COALESCE(a.score_target, 'level') AS score_target
  FROM answers_data ad
  LEFT JOIN public.alternatives a
    ON a.question_id = ad.question_id
   AND (
     a.id::text = ad.answer_ref
     OR a.score_value::text = ad.answer_ref
     OR (
       ad.answer_ref ~ '^-?[0-9]+(\.[0-9]+)?$'
       AND a.score_value = ad.answer_ref::numeric
     )
   )
),
level_agg AS (
  SELECT
    ld.id AS level_id,
    ld.name,
    ld.description,
    ld.display_order,
    ld.acquire_threshold,
    COALESCE(SUM(CASE WHEN sa.score_target = 'level' THEN sa.score_value ELSE 0 END), 0) AS level_score,
    COALESCE(SUM(CASE WHEN sa.score_target = 'potential' THEN sa.score_value ELSE 0 END), 0) AS potential_score,
    COALESCE(SUM(qm.max_level), 0) AS max_level_score,
    COALESCE(SUM(qm.max_potential), 0) AS max_potential_score,
    COALESCE(SUM(qm.max_total), 0) AS max_total_score
  FROM levels_data ld
  LEFT JOIN question_max qm ON qm.level_id = ld.id
  LEFT JOIN selected_alternatives sa ON sa.question_id = qm.question_id
  GROUP BY ld.id, ld.name, ld.description, ld.display_order, ld.acquire_threshold
)
SELECT COALESCE(
  jsonb_object_agg(
    la.level_id::text,
    jsonb_build_object(
      'level_id', la.level_id,
      'name', la.name,
      'description', la.description,
      'levelScore', la.level_score,
      'potentialScore', la.potential_score,
      'maxLevelScore', la.max_level_score,
      'maxPotentialScore', la.max_potential_score,
      'maxTotalScore', la.max_total_score,
      'display_order', la.display_order,
      'acquire_threshold', la.acquire_threshold
    )
  ),
  '{}'::jsonb
)
FROM level_agg la;
$$;

REVOKE ALL ON FUNCTION public.get_public_level_results(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_level_results(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_level_results(UUID) TO anon;

COMMENT ON FUNCTION public.get_public_level_results(UUID)
IS 'Retorna mapa de resultados por nível com score máximo real por pergunta para uso em PublicResults.';