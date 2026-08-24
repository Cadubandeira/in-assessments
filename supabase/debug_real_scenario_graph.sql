-- Debug de grafo de um cenário RealScenarios
-- Substitua o UUID abaixo pelo scenario_id desejado.

-- 1) Todos os nós do cenário, em ordem
SELECT
  sn.id,
  sn.node_type,
  sn.display_order,
  sn.is_entry_node,
  sn.outcome_type,
  LEFT(sn.content, 260) AS content_preview
FROM public.scenario_nodes sn
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
ORDER BY sn.display_order;

-- 2) Todas as opções com destino explícito
SELECT
  sn.id AS source_node_id,
  sn.display_order AS source_display_order,
  sn.node_type AS source_node_type,
  opt.ordinality - 1 AS option_index,
  opt.value->>'text' AS option_text,
  opt.value->>'next_node_id' AS next_node_id,
  LEFT(COALESCE(opt.value->>'consequence_text', ''), 220) AS consequence_preview
FROM public.scenario_nodes sn
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sn.decision_options, '[]'::jsonb)) WITH ORDINALITY AS opt(value, ordinality)
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
ORDER BY sn.display_order, opt.ordinality;

-- 3) Quais nós apontam para o nó final
WITH final_nodes AS (
  SELECT id
  FROM public.scenario_nodes
  WHERE scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
    AND node_type = 'final'
)
SELECT
  sn.id AS source_node_id,
  sn.display_order AS source_display_order,
  opt.ordinality - 1 AS option_index,
  opt.value->>'text' AS option_text,
  opt.value->>'next_node_id' AS next_node_id
FROM public.scenario_nodes sn
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sn.decision_options, '[]'::jsonb)) WITH ORDINALITY AS opt(value, ordinality)
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  AND (opt.value->>'next_node_id')::uuid IN (SELECT id FROM final_nodes)
ORDER BY sn.display_order, opt.ordinality;

-- 4) Resumo estrutural
SELECT
  COUNT(*) FILTER (WHERE node_type = 'initial') AS total_initial,
  COUNT(*) FILTER (WHERE node_type = 'decision') AS total_decision,
  COUNT(*) FILTER (WHERE node_type = 'final') AS total_final,
  COUNT(*) FILTER (WHERE node_type = 'final' AND outcome_type = 'success') AS total_success,
  COUNT(*) FILTER (WHERE node_type = 'final' AND outcome_type = 'partial') AS total_partial,
  COUNT(*) FILTER (WHERE node_type = 'final' AND outcome_type = 'failure') AS total_failure
FROM public.scenario_nodes
WHERE scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
