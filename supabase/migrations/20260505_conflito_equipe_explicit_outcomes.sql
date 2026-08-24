-- Curadoria explicita de desfechos
-- Cenário: Conflito de Equipe: Crise de Liderança
-- scenario_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890

-- Estrutura identificada:
-- - Nó final genérico atual: ffffffff-ffff-ffff-ffff-ffffffffffff
-- - Caminho de sucesso converge em: 54000000-0000-0000-0000-000000000001
-- - Caminho de falha crítica identificado em: 24000000-0000-0000-0000-000000000001, option_index = 2

-- 1) Reclassificar o final genérico atual como parcial para uso futuro.
UPDATE public.scenario_nodes
SET outcome_type = 'partial'
WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
  AND scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;

-- 2) Criar final explícito de sucesso.
INSERT INTO public.scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node,
  outcome_type
) VALUES (
  '90000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'final',
  '<div class="space-y-6 text-center"><h2 class="text-3xl font-bold text-gray-900 mb-4">Desfecho: liderança eficaz sob pressão</h2><div class="max-w-2xl mx-auto space-y-4"><p class="text-lg text-gray-700">Você reconstruiu clareza, ritmo e confiança no time. O conflito entre Ana e Carlos deixou de contaminar a entrega.</p><blockquote><p>"Agora ficou claro quem decide o quê e como seguimos daqui para frente."</p></blockquote><p class="text-base text-gray-700">O aprendizado central deste caminho é que liderança em crise exige definição, coordenação e sinal concreto de responsabilidade compartilhada.</p></div></div>',
  '{}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  1001,
  false,
  'success'
)
ON CONFLICT (id) DO NOTHING;

-- 3) Criar final explícito de falha.
INSERT INTO public.scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node,
  outcome_type
) VALUES (
  '90000000-0000-0000-0000-000000000002'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'final',
  '<div class="space-y-6 text-center"><h2 class="text-3xl font-bold text-gray-900 mb-4">Desfecho: falha de liderança crítica</h2><div class="max-w-2xl mx-auto space-y-4"><p class="text-lg text-gray-700">A saída de Carlos não resolveu a raiz do problema. O time perde referência, a confiança se deteriora e o risco operacional aumenta.</p><blockquote><p>"Ainda não existe direção suficiente para recuperar o time a tempo."</p></blockquote><p class="text-base text-gray-700">O aprendizado deste caminho é direto: evitar mediação estrutural ou terceirizar a tensão para RH pode aliviar o curto prazo, mas agrava a perda de capacidade do time.</p></div></div>',
  '{}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  1002,
  false,
  'failure'
)
ON CONFLICT (id) DO NOTHING;

-- 4) Redirecionar o caminho explicitamente bem-sucedido para o final de sucesso.
UPDATE public.scenario_nodes
SET decision_options = jsonb_set(
  jsonb_set(
    jsonb_set(
      decision_options,
      '{0,next_node_id}',
      to_jsonb('90000000-0000-0000-0000-000000000001'::text),
      true
    ),
    '{1,next_node_id}',
    to_jsonb('90000000-0000-0000-0000-000000000001'::text),
    true
  ),
  '{2,next_node_id}',
  to_jsonb('90000000-0000-0000-0000-000000000001'::text),
  true
)
WHERE id = '54000000-0000-0000-0000-000000000001'::uuid
  AND scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;

-- 5) Redirecionar o caminho explícito de falha crítica para o final de falha.
UPDATE public.scenario_nodes
SET decision_options = jsonb_set(
  decision_options,
  '{2,next_node_id}',
  to_jsonb('90000000-0000-0000-0000-000000000002'::text),
  true
)
WHERE id = '24000000-0000-0000-0000-000000000001'::uuid
  AND scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;

-- 6) Sanidade esperada após aplicar:
-- total_final = 3
-- total_success = 1
-- total_partial = 1
-- total_failure = 1
