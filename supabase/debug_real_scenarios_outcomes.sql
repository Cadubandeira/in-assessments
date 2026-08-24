-- Debug RealScenarios outcomes
-- Rode cada query separadamente no SQL Editor do Supabase.

-- 1) Inventario completo de nos finais
SELECT
  sn.id,
  sn.scenario_id,
  ss.title AS scenario_title,
  sn.display_order,
  sn.outcome_type,
  LEFT(sn.content, 220) AS content_preview
FROM public.scenario_nodes sn
JOIN public.scenario_simulations ss ON ss.id = sn.scenario_id
WHERE sn.node_type = 'final'
ORDER BY ss.title, sn.display_order;

-- 2) Contagem de nos finais por cenario
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

-- 3) Cenarios sem nenhum final de insucesso
SELECT
  ss.id AS scenario_id,
  ss.title,
  COUNT(*) FILTER (WHERE sn.node_type = 'final') AS total_finais,
  COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'failure') AS finais_failure
FROM public.scenario_simulations ss
LEFT JOIN public.scenario_nodes sn ON sn.scenario_id = ss.id
WHERE ss.is_active = true
GROUP BY ss.id, ss.title
HAVING COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'failure') = 0
ORDER BY ss.title;

-- 4) Cenarios sem nenhum final de sucesso
SELECT
  ss.id AS scenario_id,
  ss.title,
  COUNT(*) FILTER (WHERE sn.node_type = 'final') AS total_finais,
  COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'success') AS finais_success
FROM public.scenario_simulations ss
LEFT JOIN public.scenario_nodes sn ON sn.scenario_id = ss.id
WHERE ss.is_active = true
GROUP BY ss.id, ss.title
HAVING COUNT(*) FILTER (WHERE sn.node_type = 'final' AND sn.outcome_type = 'success') = 0
ORDER BY ss.title;

-- 5) Ver todos os nos de um cenario especifico
-- Substitua o UUID abaixo.
-- SELECT
--   sn.id,
--   sn.node_type,
--   sn.display_order,
--   sn.outcome_type,
--   LEFT(sn.content, 220) AS content_preview
-- FROM public.scenario_nodes sn
-- WHERE sn.scenario_id = 'COLE_O_SCENARIO_ID_AQUI'::uuid
-- ORDER BY sn.display_order;
