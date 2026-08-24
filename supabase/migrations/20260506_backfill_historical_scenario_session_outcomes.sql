-- Backfill historico de outcome_type em scenario_sessions
-- Objetivo: sincronizar sessoes concluidas antigas com o outcome_type do ultimo no percorrido.

WITH session_last_node AS (
  SELECT
    s.id AS session_id,
    s.scenario_id,
    (
      s.decision_path -> (
        jsonb_array_length(s.decision_path) - 1
      )
    ) #>> '{}' AS last_node_id
  FROM public.scenario_sessions s
  WHERE s.status = 'completed'
    AND COALESCE(s.outcome_type, 'neutral') = 'neutral'
    AND jsonb_typeof(s.decision_path) = 'array'
    AND jsonb_array_length(s.decision_path) > 0
),
resolved_outcomes AS (
  SELECT
    sln.session_id,
    sn.outcome_type
  FROM session_last_node sln
  JOIN public.scenario_nodes sn
    ON sn.id = sln.last_node_id::uuid
   AND sn.scenario_id = sln.scenario_id
   AND sn.node_type = 'final'
  WHERE sn.outcome_type IS NOT NULL
    AND sn.outcome_type <> 'neutral'
)
UPDATE public.scenario_sessions s
SET outcome_type = resolved_outcomes.outcome_type
FROM resolved_outcomes
WHERE s.id = resolved_outcomes.session_id;
