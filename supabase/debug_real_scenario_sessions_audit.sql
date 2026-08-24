-- Auditoria de sessoes historicas RealScenarios
-- Objetivo: verificar se scenario_sessions.outcome_type bate com o ultimo no da decision_path.

WITH session_last_node AS (
  SELECT
    s.id AS session_id,
    s.scenario_id,
    s.status,
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
),
resolved AS (
  SELECT
    sln.session_id,
    sln.scenario_id,
    sln.status,
    sln.completed_at,
    sln.session_outcome_type,
    sln.last_node_id,
    sn.node_type AS last_node_type,
    sn.outcome_type AS last_node_outcome_type,
    LEFT(sn.content, 220) AS last_node_preview
  FROM session_last_node sln
  LEFT JOIN public.scenario_nodes sn
    ON sn.id = sln.last_node_id::uuid
   AND sn.scenario_id = sln.scenario_id
)
SELECT
  r.session_id,
  r.scenario_id,
  ss.title AS scenario_title,
  r.status,
  r.completed_at,
  r.session_outcome_type,
  r.last_node_id,
  r.last_node_type,
  r.last_node_outcome_type,
  r.last_node_preview,
  CASE
    WHEN r.last_node_type IS NULL THEN 'missing_last_node'
    WHEN r.last_node_type <> 'final' THEN 'last_node_not_final'
    WHEN COALESCE(r.session_outcome_type, 'neutral') <> COALESCE(r.last_node_outcome_type, 'neutral') THEN 'outcome_mismatch'
    ELSE 'ok'
  END AS audit_status
FROM resolved r
JOIN public.scenario_simulations ss ON ss.id = r.scenario_id
WHERE ss.is_active = true
ORDER BY r.completed_at DESC NULLS LAST;
