-- Reconciliacao de sessoes RealScenarios presas em no final
-- Uso: rodar manualmente quando a auditoria apontar sessoes in_progress/abandoned em no final.

WITH session_last_node AS (
  SELECT
    s.id AS session_id,
    s.scenario_id,
    s.status,
    s.started_at,
    s.completed_at,
    s.outcome_type AS session_outcome_type,
    (
      s.decision_path -> (
        jsonb_array_length(s.decision_path) - 1
      )
    ) #>> '{}' AS last_node_id
  FROM public.scenario_sessions s
  WHERE jsonb_typeof(s.decision_path) = 'array'
    AND jsonb_array_length(s.decision_path) > 0
    AND s.status IN ('in_progress', 'abandoned')
),
resolved AS (
  SELECT
    sln.session_id,
    sln.status,
    sln.started_at,
    sln.completed_at,
    sln.session_outcome_type,
    sn.node_type AS last_node_type,
    sn.outcome_type AS last_node_outcome_type
  FROM session_last_node sln
  JOIN public.scenario_nodes sn
    ON sn.id = sln.last_node_id::uuid
   AND sn.scenario_id = sln.scenario_id
  WHERE sn.node_type = 'final'
)
UPDATE public.scenario_sessions s
SET status = 'completed',
    completed_at = COALESCE(s.completed_at, now()),
    outcome_type = COALESCE(resolved.last_node_outcome_type, s.outcome_type, 'neutral')
FROM resolved
WHERE s.id = resolved.session_id
  AND (s.status <> 'completed' OR COALESCE(s.outcome_type, 'neutral') <> COALESCE(resolved.last_node_outcome_type, 'neutral'));
