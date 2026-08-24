-- Validacao pos-curadoria de RealScenarios
-- Use estas queries apos aplicar migrations de branching/outcomes.

-- 1) Resumo de desfechos por cenário ativo
SELECT
  ss.id AS scenario_id,
  ss.title,
  COUNT(*) FILTER (WHERE sn.node_type = 'final') AS total_finais,
  COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'success') AS finais_success,
  COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'partial') AS finais_partial,
  COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'failure') AS finais_failure,
  COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'neutral') AS finais_neutral
FROM public.scenario_simulations ss
LEFT JOIN public.scenario_nodes sn ON sn.scenario_id = ss.id
WHERE ss.is_active = true
GROUP BY ss.id, ss.title
ORDER BY ss.title;

-- 2) Cenários ativos ainda sem final de sucesso
SELECT
  ss.id AS scenario_id,
  ss.title,
  COUNT(*) FILTER (WHERE sn.node_type = 'final') AS total_finais
FROM public.scenario_simulations ss
LEFT JOIN public.scenario_nodes sn ON sn.scenario_id = ss.id
WHERE ss.is_active = true
GROUP BY ss.id, ss.title
HAVING COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'success') = 0
ORDER BY ss.title;

-- 3) Cenários ativos ainda sem final de insucesso
SELECT
  ss.id AS scenario_id,
  ss.title,
  COUNT(*) FILTER (WHERE sn.node_type = 'final') AS total_finais
FROM public.scenario_simulations ss
LEFT JOIN public.scenario_nodes sn ON sn.scenario_id = ss.id
WHERE ss.is_active = true
GROUP BY ss.id, ss.title
HAVING COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'failure') = 0
ORDER BY ss.title;

-- 4) Finais ainda neutros (precisam de curadoria)
SELECT
  ss.title AS scenario_title,
  sn.id AS final_node_id,
  sn.display_order,
  LEFT(sn.content, 240) AS content_preview
FROM public.scenario_nodes sn
JOIN public.scenario_simulations ss ON ss.id = sn.scenario_id
WHERE ss.is_active = true
  AND sn.node_type = 'final'
  AND COALESCE(sn.outcome_type, 'neutral') = 'neutral'
ORDER BY ss.title, sn.display_order;

-- 5) Sessoes historicas completadas ainda neutras
SELECT
  s.id AS session_id,
  s.scenario_id,
  ss.title AS scenario_title,
  s.completed_at,
  s.outcome_type
FROM public.scenario_sessions s
JOIN public.scenario_simulations ss ON ss.id = s.scenario_id
WHERE s.status = 'completed'
  AND COALESCE(s.outcome_type, 'neutral') = 'neutral'
ORDER BY s.completed_at DESC NULLS LAST;
