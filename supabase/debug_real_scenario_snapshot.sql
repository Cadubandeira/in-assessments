-- Snapshot unico para curadoria do cenário
-- Cenário alvo: Conflito de Equipe: Crise de Liderança
-- scenario_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890

WITH final_nodes AS (
  SELECT
    sn.id,
    sn.display_order,
    sn.outcome_type,
    LEFT(sn.content, 400) AS preview
  FROM public.scenario_nodes sn
  WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
    AND sn.node_type = 'final'
  ORDER BY sn.display_order DESC
),
entry_nodes AS (
  SELECT
    sn.id,
    sn.node_type,
    sn.display_order,
    sn.is_entry_node,
    LEFT(sn.content, 260) AS preview
  FROM public.scenario_nodes sn
  WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
    AND sn.is_entry_node = true
  ORDER BY sn.display_order
),
last_decisions AS (
  SELECT
    sn.id,
    sn.display_order,
    sn.is_entry_node,
    LEFT(sn.content, 320) AS preview
  FROM public.scenario_nodes sn
  WHERE sn.scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
    AND sn.node_type = 'decision'
  ORDER BY sn.display_order DESC
  LIMIT 5
),
links_to_final AS (
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
    AND EXISTS (
      SELECT 1
      FROM final_nodes fn
      WHERE (opt.value->>'next_node_id')::uuid = fn.id
    )
  ORDER BY sn.display_order DESC, opt.ordinality
),
structure_summary AS (
  SELECT
    COUNT(*) FILTER (WHERE node_type = 'initial') AS total_initial,
    COUNT(*) FILTER (WHERE node_type = 'decision') AS total_decision,
    COUNT(*) FILTER (WHERE node_type = 'final') AS total_final,
    COUNT(*) FILTER (WHERE node_type = 'final' AND outcome_type = 'success') AS total_success,
    COUNT(*) FILTER (WHERE node_type = 'final' AND outcome_type = 'partial') AS total_partial,
    COUNT(*) FILTER (WHERE node_type = 'final' AND outcome_type = 'failure') AS total_failure
  FROM public.scenario_nodes
  WHERE scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
)
SELECT jsonb_build_object(
  'summary', (SELECT to_jsonb(structure_summary) FROM structure_summary),
  'entry_nodes', COALESCE((SELECT jsonb_agg(to_jsonb(entry_nodes)) FROM entry_nodes), '[]'::jsonb),
  'final_nodes', COALESCE((SELECT jsonb_agg(to_jsonb(final_nodes)) FROM final_nodes), '[]'::jsonb),
  'last_decisions', COALESCE((SELECT jsonb_agg(to_jsonb(last_decisions)) FROM last_decisions), '[]'::jsonb),
  'links_to_final', COALESCE((SELECT jsonb_agg(to_jsonb(links_to_final)) FROM links_to_final), '[]'::jsonb)
) AS scenario_snapshot;