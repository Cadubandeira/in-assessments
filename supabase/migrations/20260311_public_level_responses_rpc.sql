-- Migration: public RPC for level question/answer details in shared results
-- Date: 2026-03-11
-- Goal: permitir que PublicResults recupere perguntas e respostas por nível com segurança e sem depender de múltiplas queries client-side

CREATE OR REPLACE FUNCTION public.get_public_level_responses(p_event_id UUID)
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
    l.display_order
  FROM public.assessment_levels l
  JOIN event_data ed ON ed.assessment_version_id = l.assessment_version_id
),
questions_data AS (
  SELECT
    q.id,
    q.text,
    q.display_order,
    q.level_id,
    ld.display_order AS level_display_order
  FROM public.questions q
  JOIN levels_data ld ON ld.id = q.level_id
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
    a.text AS alternative_text,
    a.score_value AS alternative_score_value
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
question_rows AS (
  SELECT
    q.level_id,
    q.id AS question_id,
    q.text AS question_text,
    q.display_order,
    ROW_NUMBER() OVER (ORDER BY q.level_display_order ASC, q.display_order ASC, q.id ASC) AS question_number,
    sa.alternative_text,
    COALESCE(sa.alternative_score_value::text, ad.answer_ref) AS answer_value,
    CASE
      WHEN sa.alternative_id IS NOT NULL THEN true
      WHEN ad.answer_ref IS NOT NULL THEN true
      ELSE false
    END AS is_answered
  FROM questions_data q
  LEFT JOIN answers_data ad ON ad.question_id = q.id
  LEFT JOIN selected_alternatives sa ON sa.question_id = q.id
),
level_question_agg AS (
  SELECT
    ld.id AS level_id,
    ld.name,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'questionId', qr.question_id,
          'questionText', COALESCE(qr.question_text, 'Pergunta sem texto'),
          'answerText', qr.alternative_text,
          'answerValue', qr.answer_value,
          'isAnswered', qr.is_answered,
          'questionNumber', qr.question_number
        )
        ORDER BY qr.display_order ASC, qr.question_id ASC
      ) FILTER (WHERE qr.question_id IS NOT NULL),
      '[]'::jsonb
    ) AS questions
  FROM levels_data ld
  LEFT JOIN question_rows qr ON qr.level_id = ld.id
  GROUP BY ld.id, ld.name, ld.display_order
  ORDER BY ld.display_order ASC
)
SELECT COALESCE(
  jsonb_object_agg(
    lqa.level_id::text,
    jsonb_build_object(
      'itemId', lqa.level_id,
      'name', lqa.name,
      'questions', lqa.questions
    )
  ),
  '{}'::jsonb
)
FROM level_question_agg lqa;
$$;

REVOKE ALL ON FUNCTION public.get_public_level_responses(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_level_responses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_level_responses(UUID) TO anon;

COMMENT ON FUNCTION public.get_public_level_responses(UUID)
IS 'Retorna perguntas e respostas por nível para uso seguro no PublicResults de assessments schema=niveis.';
