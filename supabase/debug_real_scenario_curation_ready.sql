-- RealScenarios: debug objetivo para curadoria final de um cenário
-- Cenário alvo: Conflito de Equipe: Crise de Liderança
-- scenario_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890

-- 1) Nó final atual
SELECT
  sn.id AS final_node_id,
  sn.display_order,
  sn.outcome_type,
  LEFT(sn.content, 400) AS final_preview
FROM public.scenario_nodes sn
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  AND sn.node_type = 'final'
ORDER BY sn.display_order DESC;

-- 2) Últimos nós decisórios do cenário
SELECT
  sn.id AS decision_node_id,
  sn.display_order,
  sn.is_entry_node,
  LEFT(sn.content, 300) AS decision_preview
FROM public.scenario_nodes sn
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  AND sn.node_type = 'decision'
ORDER BY sn.display_order DESC
LIMIT 5;

-- 3) Quais opções apontam para o final atual
WITH final_node AS (
  SELECT id
  FROM public.scenario_nodes
  WHERE scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
    AND node_type = 'final'
  ORDER BY display_order DESC
  LIMIT 1
)
SELECT
  sn.id AS source_node_id,
  sn.display_order AS source_display_order,
  opt.ordinality - 1 AS option_index,
  opt.value->>'text' AS option_text,
  opt.value->>'next_node_id' AS next_node_id,
  LEFT(COALESCE(opt.value->>'consequence_text', ''), 280) AS consequence_preview
FROM public.scenario_nodes sn
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sn.decision_options, '[]'::jsonb)) WITH ORDINALITY AS opt(value, ordinality)
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  AND (opt.value->>'next_node_id')::uuid = (SELECT id FROM final_node)
ORDER BY sn.display_order DESC, opt.ordinality;

-- 4) Primeiros nós decisórios (para detectar o ponto de entrada real)
SELECT
  sn.id AS decision_node_id,
  sn.display_order,
  sn.is_entry_node,
  LEFT(sn.content, 260) AS decision_preview
FROM public.scenario_nodes sn
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  AND sn.node_type = 'decision'
ORDER BY sn.display_order ASC
LIMIT 5;

-- 5) Sanidade: nós marcados como entrada
SELECT
  sn.id,
  sn.node_type,
  sn.display_order,
  sn.is_entry_node,
  LEFT(sn.content, 220) AS content_preview
FROM public.scenario_nodes sn
WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  AND sn.is_entry_node = true
ORDER BY sn.display_order;
