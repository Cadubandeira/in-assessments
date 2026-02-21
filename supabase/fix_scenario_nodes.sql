-- =====================================================
-- Fix Real Scenarios - Make all decisions point to final node
-- =====================================================

-- Update Node 2 (Confrontation Path) - all decisions point to final
UPDATE scenario_nodes
SET decision_options = '[
  {
    "text": "Estabelecer regras claras de comunicação e pedir que cada um fale sem interrupções",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>Você levanta a mão pedindo silêncio.</p><p>\"Regra número 1: um fala, o outro escuta. Regra número 2: foco em fatos, não em julgamentos.\"</p><p>Carlos respira fundo. Ana concorda com a cabeça.</p><p>A conversa se torna mais produtiva. Ambos conseguem expressar seus pontos sem escalar o conflito.</p>",
    "pressure_changes": [],
    "indicators_weight": {"leadership": 0.9, "communication": 0.8}
  },
  {
    "text": "Focar no objetivo comum: entregar o projeto em 15 dias",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>\"Olha, vocês dois são profissionais excepcionais. Temos 15 dias. O cliente está esperando. Vamos resolver isso?\"</p><p>Carlos e Ana concordam em focar no trabalho. A tensão diminui um pouco.</p>",
    "pressure_changes": ["ambiguity_increased"],
    "indicators_weight": {"leadership": 0.5, "pragmatism": 0.7}
  },
  {
    "text": "Admitir que você deveria ter intervindo antes e assumir responsabilidade",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>\"Eu errei. Deveria ter percebido isso antes. Estou aqui agora para corrigir.\"</p><p>Ana olha surpresa. Carlos baixa um pouco a guarda.</p><p>O clima muda sutilmente. Ambos parecem mais receptivos. Sua vulnerabilidade criou abertura para o diálogo.</p>",
    "pressure_changes": [],
    "indicators_weight": {"leadership": 1.0, "vulnerability": 0.9, "empathy": 0.8}
  }
]'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;

-- Update Node 3 (Empathy Path) - all decisions point to final
UPDATE scenario_nodes
SET decision_options = '[
  {
    "text": "Validar os sentimentos de Carlos mas pedir que ele veja a perspectiva de Ana",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>\"Carlos, entendo sua frustração. E se Ana também estiver se sentindo desrespeitada?\"</p><p>Ele para. Pensa. \"Eu não ataco ela, só discordo tecnicamente.\"</p><p>\"E como você discorda importa tanto quanto o que você discorda.\"</p><p>Carlos reflete. Você conseguiu plantar a semente da empatia.</p>",
    "pressure_changes": [],
    "indicators_weight": {"empathy": 1.0, "communication": 0.9}
  },
  {
    "text": "Mostrar o Slack de Ana para Carlos imediatamente",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>Você vira o celular: \"Ana acabou de me mandar isso.\"</p><p>Carlos lê. Seu rosto muda. \"Ela quer sair por minha causa?\"</p><p>\"Vocês dois precisam conversar. Mas preciso que você entre nessa conversa de forma diferente.\"</p><p>A transparência criou um ponto de virada.</p>",
    "pressure_changes": ["stakes_increased"],
    "indicators_weight": {"transparency": 0.8, "risk": 0.7}
  },
  {
    "text": "Confrontar Carlos sobre ele usar RH como ferramenta de pressão",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>\"Carlos, copiar RH naquele e-mail foi uma tentativa de documentar ou de pressionar Ana?\"</p><p>Ele fica desconfortável. \"Eu... precisava me proteger.\"</p><p>\"Se proteger de quê? De uma colega que discorda de você tecnicamente?\"</p><p>O confronto foi direto mas necessário. Carlos reconhece sua postura defensiva.</p>",
    "pressure_changes": ["ambiguity_increased"],
    "indicators_weight": {"assertiveness": 1.0, "confrontation": 0.9}
  }
]'::jsonb
WHERE id = '33333333-3333-3333-3333-333333333333'::uuid;

-- Update Node 4 (HR Escalation Path) - all decisions point to final
UPDATE scenario_nodes
SET decision_options = '[
  {
    "text": "Reorganizar as tarefas para que Ana e Carlos não precisem interagir até a mediação",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>Você redistribui as tasks. Ana fica com front-end, Carlos com back-end.</p><p>O projeto avança, mas o conflito não foi resolvido. A mediação de RH eventualmente acontece.</p><p>Você escolheu o caminho mais seguro, mas menos efetivo para transformação real.</p>",
    "pressure_changes": ["stakes_increased", "time_pressure_added"],
    "indicators_weight": {"pragmatism": 0.5, "leadership": 0.3}
  },
  {
    "text": "Ter uma conversa individual com cada um antes da mediação formal",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>Você decide não esperar RH.</p><p>Conversa com Ana: ela se sente desvalorizada. Conversa com Carlos: ele se sente atacado.</p><p>Ambos querem resolver, mas não sabem como. Você facilita esse processo com empatia.</p>",
    "pressure_changes": [],
    "indicators_weight": {"leadership": 0.8, "empathy": 0.9}
  }
]'::jsonb
WHERE id = '44444444-4444-4444-4444-444444444444'::uuid;

-- Update Node 5 (Investigation Path) - all decisions point to final
UPDATE scenario_nodes
SET decision_options = '[
  {
    "text": "Reunir Ana e Carlos mostrando que você entende ambos os lados",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>Você convoca os dois.</p><p>\"Carlos, você tomou uma decisão unilateral. Ana, você criticou publicamente. Ambos têm razão e ambos erraram.\"</p><p>\"O que fazemos agora?\"</p><p>Sua abordagem equilibrada cria espaço para reconciliação.</p>",
    "pressure_changes": [],
    "indicators_weight": {"leadership": 1.0, "fairness": 1.0, "empathy": 0.8}
  },
  {
    "text": "Focar em process: criar regra de como decisões técnicas devem ser tomadas na equipe",
    "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "consequence_text": "<p>\"O problema não são vocês, é a falta de processo.\"</p><p>Você propõe: decisões técnicas grandes = discussão em grupo + documentação + consenso.</p><p>Ana e Carlos concordam. O processo sistêmico previne futuros conflitos.</p>",
    "pressure_changes": [],
    "indicators_weight": {"systematic": 0.9, "pragmatism": 0.8}
  }
]'::jsonb
WHERE id = '55555555-5555-5555-5555-555555555555'::uuid;

-- Verify the fix
SELECT 
  id, 
  node_type,
  jsonb_array_length(decision_options) as num_options,
  decision_options->0->'next_node_id' as first_option_next
FROM scenario_nodes
WHERE scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
ORDER BY display_order;

COMMENT ON TABLE scenario_nodes IS 'Nodes 2-5 agora apontam diretamente para o final node, criando um cenário funcional de 2 níveis de decisão.';
