-- =====================================================
-- Seed Data: Cenário "Conflito de Equipe"
-- Exemplo completo de simulação adaptativa
-- =====================================================

-- Step 1: Create the scenario
INSERT INTO scenario_simulations (
  id,
  title,
  description,
  initial_context,
  target_indicators,
  difficulty_level,
  estimated_duration_minutes,
  is_active
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Conflito de Equipe',
  'Dois colaboradores-chave estão em conflito aberto. Como gestor, você precisa navegar esta situação delicada mantendo a entrega do projeto e o clima da equipe.',
  '<p>Você é gestor de uma equipe de 8 pessoas. Dois colaboradores-chave, <strong>Ana</strong> (desenvolvedora sênior) e <strong>Carlos</strong> (líder técnico), estão em conflito aberto há 2 semanas.</p><p>A tensão está afetando toda a equipe, e a entrega de um projeto importante está em <strong>15 dias</strong>.</p><p>Ontem, Ana te procurou pedindo para não trabalhar mais com Carlos. Hoje de manhã, Carlos enviou um e-mail (copiando RH) criticando a "falta de profissionalismo" de Ana.</p><p><strong>Você tem uma reunião 1:1 com Carlos em 30 minutos.</strong> O que você faz AGORA?</p>',
  '["Liderança", "Comunicação", "Gestão de Conflitos"]'::jsonb,
  'medium',
  12,
  true
);

-- Step 2: Create nodes

-- Node 1: Initial Decision
INSERT INTO scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<p class="text-lg font-semibold text-gray-900 mb-3">Você precisa decidir rapidamente.</p><p>Carlos chegará em 30 minutos para a reunião 1:1 que você agendou antes de saber da gravidade do conflito.</p><p>Ana está claramente desconfortável e pediu para "não ter que trabalhar mais com ele".</p><p>O projeto precisa ser entregue em 15 dias e ambos são essenciais.</p>',
  '{"time_limit": 45, "stakes": "high", "ambiguity": "moderate"}'::jsonb,
  '[
    {
      "text": "Cancelar a reunião com Carlos e falar com ambos juntos agora",
      "next_node_id": "22222222-2222-2222-2222-222222222222",
      "consequence_text": "<p>Você cancela a reunião e convoca Ana e Carlos para uma conversa conjunta.</p><p>Quando ambos chegam, a tensão é palpável. Carlos cruza os braços defensivamente. Ana evita contato visual.</p>",
      "pressure_changes": ["stakes_increased", "ambiguity_increased"],
      "indicators_weight": {"risk": 0.6, "decisiveness": 0.7}
    },
    {
      "text": "Manter a reunião com Carlos e ouvir o lado dele primeiro",
      "next_node_id": "33333333-3333-3333-3333-333333333333",
      "consequence_text": "<p>Você mantém a reunião. Carlos entra claramente irritado.</p><p>Ele apresenta 5 situações nos últimos 2 meses onde Ana, segundo ele, \"sabotou\" suas decisões técnicas na frente da equipe.</p><p>Mas você percebe que Carlos se sente ameaçado pela competência técnica de Ana, e interpreta discordâncias como ataques pessoais.</p>",
      "pressure_changes": ["information_revealed"],
      "indicators_weight": {"risk": 0.3, "empathy": 0.8}
    },
    {
      "text": "Envolver RH imediatamente antes da reunião",
      "next_node_id": "44444444-4444-4444-4444-444444444444",
      "consequence_text": "<p>Você telefona para o RH e explica a situação.</p><p>A analista de RH sugere uma \"mediação formal\" que levaria pelo menos 3 dias para organizar.</p><p>Enquanto isso, você recebe uma mensagem da equipe: \"O clima está insuportável, ninguém consegue trabalhar direito.\"</p>",
      "pressure_changes": ["time_pressure_added", "new_constraint_added"],
      "indicators_weight": {"risk": -0.4, "collaboration": 0.5}
    },
    {
      "text": "Adiar tudo e fazer uma investigação mais profunda com outros membros da equipe",
      "next_node_id": "55555555-5555-5555-5555-555555555555",
      "consequence_text": "<p>Você cancela a reunião com Carlos e começa a conversar individualmente com membros da equipe.</p><p>Descobre que o conflito começou quando Carlos rejeitou uma proposta técnica de Ana sem consultá-la, e ela respondeu criticando sua decisão publicamente no Slack.</p><p>Mas agora já são 2 semanas de tensão acumulada. Faltam 15 dias para entrega.</p>",
      "pressure_changes": ["information_revealed", "time_pressure_added"],
      "indicators_weight": {"risk": -0.2, "analytical": 0.9}
    }
  ]'::jsonb,
  '{"requires_analytical": true, "emotional_load": "high", "cognitive_complexity": "high"}'::jsonb,
  1,
  true
);

-- Node 2: Confrontation Path
INSERT INTO scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<p class="text-lg font-semibold text-gray-900 mb-3">Os dois estão na sala com você. A tensão é palpável.</p><p>Carlos começa: "Não entendo por que estamos aqui. Eu documentei tudo no e-mail."</p><p>Ana responde: "Claro, porque você sempre precisa estar certo."</p><p>O conflito pode escalar rapidamente.</p>',
  '{"time_limit": 60, "stakes": "critical", "ambiguity": "high"}'::jsonb,
  '[
    {
      "text": "Estabelecer regras claras de comunicação e pedir que cada um fale sem interrupções",
      "next_node_id": "66666666-6666-6666-6666-666666666666",
      "consequence_text": "<p>Você levanta a mão pedindo silêncio.</p><p>\"Regra número 1: um fala, o outro escuta. Regra número 2: foco em fatos, não em julgamentos.\"</p><p>Carlos respira fundo. Ana concorda com a cabeça.</p>",
      "pressure_changes": [],
      "indicators_weight": {"leadership": 0.9, "communication": 0.8}
    },
    {
      "text": "Focar no objetivo comum: entregar o projeto em 15 dias",
      "next_node_id": "77777777-7777-7777-7777-777777777777",
      "consequence_text": "<p>\"Olha, vocês dois são profissionais excepcionais. Temos 15 dias. O cliente está esperando. Vamos resolver isso?\"</p><p>Carlos: \"Sim, mas ela precisa parar de me desrespeitar.\"</p><p>Ana: \"Eu? Você que...\"</p><p>Parece que focar no objetivo não será suficiente.</p>",
      "pressure_changes": ["ambiguity_increased"],
      "indicators_weight": {"leadership": 0.5, "pragmatism": 0.7}
    },
    {
      "text": "Admitir que você deveria ter intervindo antes e assumir responsabilidade",
      "next_node_id": "88888888-8888-8888-8888-888888888888",
      "consequence_text": "<p>\"Eu errei. Deveria ter percebido isso antes. Estou aqui agora para corrigir.\"</p><p>Ana olha surpresa. Carlos baixa um pouco a guarda.</p><p>O clima muda sutilmente. Ambos parecem mais receptivos.</p>",
      "pressure_changes": [],
      "indicators_weight": {"leadership": 1.0, "vulnerability": 0.9, "empathy": 0.8}
    }
  ]'::jsonb,
  '{"requires_intuitive": true, "emotional_load": "critical", "cognitive_complexity": "high"}'::jsonb,
  2,
  false
);

-- Node 3: Empathy Path
INSERT INTO scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<p class="text-lg font-semibold text-gray-900 mb-3">Carlos termina de desabafar.</p><p>Você percebeu que ele se sente ameaçado pela competência técnica de Ana e interpreta discordâncias como ataques pessoais.</p><p><strong>Nova informação:</strong> No meio da conversa, você recebe um Slack de Ana: \"Estou pensando seriamente em pedir demissão.\"</p><p>Você ainda está na reunião com Carlos. O que faz?</p>',
  '{"time_limit": 50, "stakes": "critical", "ambiguity": "moderate"}'::jsonb,
  '[
    {
      "text": "Validar os sentimentos de Carlos mas pedir que ele veja a perspectiva de Ana",
      "next_node_id": "99999999-9999-9999-9999-999999999999",
      "consequence_text": "<p>\"Carlos, entendo sua frustração. E se Ana também estiver se sentindo desrespeitada?\"</p><p>Ele para. Pensa. \"Eu não ataco ela, só discordo tecnicamente.\"</p><p>\"E como você discorda importa tanto quanto o que você discorda.\"</p>",
      "pressure_changes": [],
      "indicators_weight": {"empathy": 1.0, "communication": 0.9}
    },
    {
      "text": "Mostrar o Slack de Ana para Carlos imediatamente",
      "next_node_id": "10101010-1010-1010-1010-101010101010",
      "consequence_text": "<p>Você vira o celular: \"Ana acabou de me mandar isso.\"</p><p>Carlos lê. Seu rosto muda. \"Ela quer sair por minha causa?\"</p><p>\"Vocês dois precisam conversar. Mas preciso que você entre nessa conversa de forma diferente.\"</p>",
      "pressure_changes": ["stakes_increased"],
      "indicators_weight": {"transparency": 0.8, "risk": 0.7}
    },
    {
      "text": "Confrontar Carlos sobre ele usar RH como ferramenta de pressão",
      "next_node_id": "11111111-1111-1111-1111-111111111112",
      "consequence_text": "<p>\"Carlos, copiar RH naquele e-mail foi uma tentativa de documentar ou de pressionar Ana?\"</p><p>Ele fica desconfortável. \"Eu... precisava me proteger.\"</p><p>\"Se proteger de quê? De uma colega que discorda de você tecnicamente?\"</p>",
      "pressure_changes": ["ambiguity_increased"],
      "indicators_weight": {"assertiveness": 1.0, "confrontation": 0.9}
    }
  ]'::jsonb,
  '{"requires_analytical": true, "emotional_load": "high", "requires_empathy": true}'::jsonb,
  3,
  false
);

-- Node 4: HR Escalation Path (leads to sub-optimal outcome)
INSERT INTO scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  '44444444-4444-4444-4444-444444444444'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<p class="text-lg font-semibold text-gray-900 mb-3">RH está organizando a mediação formal.</p><p>Enquanto isso, você precisa manter o projeto andando.</p><p>Mas a equipe está paralisada. Ana e Carlos mal se falam. Reuniões técnicas viraram campos de batalha silenciosos.</p><p>Faltam 12 dias para entrega. O que você faz?</p>',
  '{"stakes": "critical", "time_pressure": "extreme"}'::jsonb,
  '[
    {
      "text": "Reorganizar as tarefas para que Ana e Carlos não precisem interagir até a mediação",
      "next_node_id": "12121212-1212-1212-1212-121212121212",
      "consequence_text": "<p>Você redistribui as tasks. Ana fica com front-end, Carlos com back-end.</p><p>Mas muitas tarefas requerem integração entre os dois. O projeto está atrasando.</p><p>A mediação está marcada para daqui a 3 dias.</p>",
      "pressure_changes": ["stakes_increased", "time_pressure_added"],
      "indicators_weight": {"pragmatism": 0.5, "leadership": 0.3}
    },
    {
      "text": "Ter uma conversa individual com cada um antes da mediação formal",
      "next_node_id": "13131313-1313-1313-1313-131313131313",
      "consequence_text": "<p>Você decide não esperar RH.</p><p>Conversa com Ana: ela se sente desvalorizada. Conversa com Carlos: ele se sente atacado.</p><p>Ambos querem resolver, mas não sabem como.</p>",
      "pressure_changes": [],
      "indicators_weight": {"leadership": 0.8, "empathy": 0.9}
    }
  ]'::jsonb,
  '{"requires_pragmatic": true, "time_pressure": true}'::jsonb,
  4,
  false
);

-- Node 5: Investigation Path
INSERT INTO scenario_nodes (
  id,
  scenario_id,
  node_type,  
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  '55555555-5555-5555-5555-555555555555'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<p class="text-lg font-semibold text-gray-900 mb-3">Você descobriu a raiz do conflito.</p><p>Carlos rejeitou tecnicamente uma proposta de Ana sem consultá-la. Ana criticou publicamente no Slack a decisão dele.</p><p>Ambos erraram. Mas agora são 2 semanas de tensão. A equipe inteira está afetada.</p><p>Faltam 13 dias para entrega.</p>',
  '{"stakes": "high", "ambiguity": "low", "time_pressure": "moderate"}'::jsonb,
  '[
    {
      "text": "Reunir Ana e Carlos mostrando que você entende ambos os lados",
      "next_node_id": "14141414-1414-1414-1414-141414141414",
      "consequence_text": "<p>Você convoca os dois.</p><p>\"Carlos, você tomou uma decisão unilateral. Ana, você criticou publicamente. Ambos têm razão e ambos erraram.\"</p><p>\"O que fazemos agora?\"</p>",
      "pressure_changes": [],
      "indicators_weight": {"leadership": 1.0, "fairness": 1.0, "empathy": 0.8}
    },
    {
      "text": "Focar em process: criar regra de como decisões técnicas devem ser tomadas na equipe",
      "next_node_id": "15151515-1515-1515-1515-151515151515",
      "consequence_text": "<p>\"O problema não são vocês, é a falta de processo.\"</p><p>Você propõe: decisões técnicas grandes =  discussão em grupo + documentação + consenso.</p><p>Ana e Carlos concordam. Mas ainda não falaram sobre os sentimentos.</p>",
      "pressure_changes": [],
      "indicators_weight": {"systematic": 0.9, "pragmatism": 0.8}
    }
  ]'::jsonb,
  '{"requires_analytical": true, "requires_systemic_thinking": true}'::jsonb,
  5,
  false
);

-- Final Nodes (multiple endings based on path)
-- Node 6-15 would continue the scenarios...
-- For brevity, let's create one final node

INSERT INTO scenario_nodes (
  id,
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'final',
  '<p class="text-xl font-bold text-gray-900 mb-4">Cenário concluído!</p><p>Suas decisões demonstraram padrões específicos de liderança, comunicação e gestão de conflitos.</p><p>Agora vamos analisar seu processo cognitivo...</p>',
  '{}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  99,
  false
);

-- Update intermediate nodes to point to final node
UPDATE scenario_nodes
SET decision_options = jsonb_set(
  decision_options,
  '{0,next_node_id}',
  '"ffffffff-ffff-ffff-ffff-ffffffffffff"'::jsonb
)
WHERE id IN (
  '66666666-6666-6666-6666-666666666666'::uuid,
  '77777777-7777-7777-7777-777777777777'::uuid,
  '88888888-8888-8888-8888-888888888888'::uuid,
  '99999999-9999-9999-9999-999999999999'::uuid,
  '10101010-1010-1010-1010-101010101010'::uuid,
  '11111111-1111-1111-1111-111111111112'::uuid,
  '12121212-1212-1212-1212-121212121212'::uuid,
  '13131313-1313-1313-1313-131313131313'::uuid,
  '14141414-1414-1414-1414-141414141414'::uuid,
  '15151515-1515-1515-1515-151515151515'::uuid
);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE scenario_nodes IS 'Este seed data é apenas parcial. Nodes 6-15 precisam ser expandidos com decisões intermediárias para criar um cenário completo de 10-12 minutos.';
