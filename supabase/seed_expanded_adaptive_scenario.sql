-- =====================================================
-- ADAPTIVE SCENARIO: Conflito de Equipe - Sistema Kahneman
-- 15-20 minutos | Adaptação baseada em System 1/System 2
-- Decisões influenciam próximos nodes dinamicamente
-- =====================================================

-- Delete existing scenario
DELETE FROM scenario_simulations WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;

-- Create expanded scenario
INSERT INTO scenario_simulations (
  id, title, description, initial_context, target_indicators,
  difficulty_level, estimated_duration_minutes, is_active
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Conflito de Equipe: Crise de Liderança',
  'Dois talentos-chave em conflito. Prazo crítico. Board observando. Sua decisão define o futuro da equipe.',
  '<div class="space-y-4"><p>Você é <strong>Head of Engineering</strong> há 3 meses.</p><p><strong>Ana</strong> (Tech Lead, 8 anos) e <strong>Carlos</strong> (Senior Engineer, 6 meses) estão em conflito aberto.</p><p class="font-semibold text-red-600">Situação:</p><ul class="list-disc ml-6 space-y-1"><li>Projeto crítico: <strong>15 dias</strong></li><li>Ana ameaçou pedir demissão</li><li>Carlos escalou para RH</li><li>Equipe paralisada</li><li>Reunião com Carlos em 30min</li></ul></div>',
  '["Liderança", "Inteligência Emocional", "Tomada de Decisão", "Gestão de Conflitos"]'::jsonb,
  'hard', 18, true
);

-- ========== LEVEL 1: INITIAL DECISION (Entry) ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">30 minutos até reunião com Carlos</h3><p>Três notificações chegam:</p><ol class="list-decimal ml-6 space-y-2"><li><strong>Ana (Slack):</strong> "Recebi proposta da Startup X. Preciso decidir hoje."</li><li><strong>Seu chefe:</strong> "Board perguntou sobre o projeto. Precisamos conversar."</li><li><strong>Outro Tech Lead:</strong> "Minha equipe reclama do clima nas reuniões conjuntas."</li></ol><p class="text-red-600 font-semibold">O que você faz AGORA?</p></div>',
  '{"time_limit": 45, "stakes": "critical", "ambiguity": "high", "visibility": "board"}'::jsonb,
  '[
    {
      "text": "Cancelar reunião e convocar Ana + Carlos para mediação imediata",
      "next_node_id": "21000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você respira fundo. Decisão tomada: confronto direto.</p><p>Mensagem enviada: <em>\"Ana e Carlos, sala 3 em 10min. Assunto: resolução de conflito. Obrigatório.\"</em></p><p>Você tem 10 minutos para se preparar mentalmente.</p>",
      "pressure_changes": ["apostas_aumentadas", "tempo_crítico"],
      "cognitive_tags": ["sistema1_decisivo", "alto_risco", "confrontacao"]
    },
    {
      "text": "Falar com Ana primeiro nos próximos 25 minutos",
      "next_node_id": "22000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você liga para Ana: <em>\"Pode vir aqui? Tenho 25min antes de falar com Carlos.\"</em></p><p>Ela chega em 3 minutos. Está tensa, braços cruzados.</p><p><strong>Ana:</strong> \"Você sabe o que ele fez na sexta?\"</p>",
      "pressure_changes": ["coleta_informação", "caminho_empatia"],
      "cognitive_tags": ["sistema2_analitico", "sequencial", "empatia"]
    },
    {
      "text": "Usar os 30min para investigar evidências do conflito",
      "next_node_id": "23000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você abre Slack, GitHub, Jira. Busca evidências.</p><p>Encontra: thread de 47 mensagens, PRs com comentários tensos, issues reassigned 3x.</p><p>Padrão claro: isto começou há 6 semanas, não 2.</p>",
      "pressure_changes": ["evidências_coletadas", "sistemático"],
      "cognitive_tags": ["sistema2_minucioso", "analitico", "preparacao"]
    },
    {
      "text": "Ligar para RH/seu chefe pedindo orientação antes de agir",
      "next_node_id": "24000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você disca para RH. Enquanto espera atender...</p><p>Carlos aparece na porta. 20 minutos adiantado.</p><p><strong>Carlos:</strong> \"Você está... ligando para alguém sobre isso?\"</p>",
      "pressure_changes": ["perda_controle", "escalação"],
      "cognitive_tags": ["sistema1_avesso_risco", "delegacao", "baixa_confianca"]
    }
  ]'::jsonb,
  '{"kahneman_initial_test": true, "decision_under_uncertainty": true}'::jsonb,
  1, true
);

-- ========== LEVEL 2: PATH 1 - Immediate Confrontation ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '21000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Sala de Reunião - Tensão Máxima</h3><p>Ana e Carlos sentam em lados opostos. Não se olham.</p><p><strong>Carlos:</strong> "Não entendo por que estamos aqui. Eu documentei tudo."</p><p><strong>Ana:</strong> "Claro, você sempre documenta quando quer se proteger."</p><p><strong>Carlos:</strong> "Se proteger? EU? Você que me sabotou na frente de—"</p><p><strong>Ana:</strong> "SABOTEI? Você me HUMILHOU na sexta!"</p><p class="text-red-600 font-semibold">Escalando rápido. Você tem segundos.</p></div>',
  '{"time_limit": 25, "stakes": "maximum", "emotional_intensity": "extreme"}'::jsonb,
  '[
    {
      "text": "Bater na mesa: PAREM. AGORA. Estabelecer regras.",
      "next_node_id": "31000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>BANG. Sua mão na mesa.</p><p><strong>\"PAREM.\"</strong></p><p>Silêncio.</p><p><strong>\"Regra 1: Um fala, outro escuta. Regra 2: Comportamento profissional ou saímos sem acordo. Claro?\"</strong></p><p>Ambos acenam.</p>",
      "pressure_changes": ["autoridade_estabelecida"],
      "cognitive_tags": ["sistema1_autoritario", "alta_confianca", "lideranca"]
    },
    {
      "text": "Deixar desabafarem completamente (2-3min de catarse)",
      "next_node_id": "32000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você cruza os braços e aguarda.</p><p>Por 3 minutos eles falam por cima um do outro. Raiva → Mágoa → Vulnerabilidade.</p><p>Carlos menciona se sentir \"desvalorizado\". Ana fala \"desrespeitada após 8 anos\".</p><p>O problema não é técnico. É emocional.</p>",
      "pressure_changes": ["camada_emocional_revelada"],
      "cognitive_tags": ["sistema2_paciente", "empatia", "insight_psicologico"]
    },
    {
      "text": "Pergunta disruptiva: Vocês querem GANHAR ou RESOLVER?",
      "next_node_id": "33000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Vocês querem GANHAR essa discussão ou RESOLVER o problema?\"</strong></p><p>Pausa. Ana pisca. Carlos franze a testa.</p><p><strong>\"Porque ganhar = um sai feliz, outro destruído. Resolver = ambos desconfortáveis mas funcionais. Qual escolhem?\"</strong></p>",
      "pressure_changes": ["ressignificação_bem_sucedida"],
      "cognitive_tags": ["sistema2_estrategico", "ressignificacao", "metacognicao"]
    }
  ]'::jsonb,
  '{"leadership_crisis_point": true, "emotional_intelligence_test": true}'::jsonb,
  2, false
);

-- ========== LEVEL 2: PATH 2 - Ana First (Empathy) ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '22000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Ana no seu escritório</h3><p>Ana está segurando as lágrimas.</p><p><strong>Ana:</strong> "8 anos. Mentorei a equipe. Estruturei a arquitetura. E agora vem um cara de 6 meses me tratando como júnior?"</p><p>Ela respira fundo.</p><p><strong>Ana:</strong> "Sexta, Tech Review. 20 minutos desmontando minha proposta. Na frente de TODO MUNDO. Ele não falou comigo antes. Foi direto para humilhação pública."</p><p>Seu celular vibra: Ana escreveu no Slack: <em>"Startup X: Senior Staff + equity. Resposta até amanhã."</em></p><p>18 minutos até Carlos.</p></div>',
  '{"time_limit": 40, "stakes": "retention_critical", "information": "high_value"}'::jsonb,
  '[
    {
      "text": "Validação total: Você está certa. Isso foi inaceitável.",
      "next_node_id": "34000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Ana, você tem razão. O que aconteceu foi humilhante e inaceitável.\"</strong></p><p>Ela olha surpresa. Lágrimas escorrem.</p><p><strong>Ana:</strong> \"Você... concorda comigo?\"</p><p><strong>\"Totalmente. Vou resolver isso. Mas preciso da sua parceria.\"</strong></p>",
      "pressure_changes": ["confiança_estabelecida"],
      "cognitive_tags": ["sistema2_empatia", "validacao", "inteligencia_emocional"]
    },
    {
      "text": "Investigar evidências: Me mostra o Tech Review gravado",
      "next_node_id": "35000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Mostra. Quero ver gravação, transcrição, tudo.\"</strong></p><p>15 minutos revisando juntos.</p><p>Você vê: Carlos tecnicamente correto. Mas o COMO foi completamente inapropriado.</p>",
      "pressure_changes": ["evidências_coletadas"],
      "cognitive_tags": ["sistema2_analitico", "minuciosidade", "objetividade"]
    },
    {
      "text": "Pergunta direta: Você quer resolver ou você já decidiu sair?",
      "next_node_id": "36000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Pergunta direta: você QUER resolver isso?\"</strong></p><p><strong>Ana:</strong> \"Eu não quero sair! Eu AMO essa empresa! Mas não vou ficar sem ser respeitada!\"</p><p>Informação chave: ela quer ficar SE você resolver.</p>",
      "pressure_changes": ["clarity_achieved"],
      "cognitive_tags": ["sistema2_direto", "questionamento_estrategico", "confianca"]
    }
  ]'::jsonb,
  '{"empathy_path": true, "retention_test": true}'::jsonb,
  2, false
);

-- ========== LEVEL 2: PATH 3 - Investigation ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '23000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Investigação - 15min até Carlos</h3><p>Você encontrou o thread no Slack de 6 semanas atrás:</p><ul class="list-disc ml-6 space-y-2"><li><strong>Semana 1:</strong> Carlos questiona arquitetura de Ana publicamente</li><li><strong>Ana responde:</strong> Explica contexto histórico</li><li><strong>Carlos:</strong> "Precisamos modernizar. Isso é de 2018."</li><li><strong>Thread explode:</strong> 47 mensagens, equipe se dividindo</li></ul><p>GitHub: PRs com comentários cada vez mais tensos.</p><p class="text-red-600 font-semibold">Conflito tem 6 semanas. Você não percebeu.</p></div>',
  '{"time_limit": 35, "guilt_factor": "present", "information": "complete"}'::jsonb,
  '[
    {
      "text": "Assumir responsabilidade: EU falhei como líder",
      "next_node_id": "37000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Carlos chega. Você começa:</p><p><strong>\"Carlos, antes de tudo: EU falhei. Deveria ter visto isso há 6 semanas. Não deveria ter chegado aqui.\"</strong></p><p>Carlos para. Não esperava isso.</p>",
      "pressure_changes": ["vulnerabilidade_mostrada"],
      "cognitive_tags": ["sistema2_autoconsciente", "accountability", "lideranca"]
    },
    {
      "text": "Confrontar ambos sobre não terem escalado antes",
      "next_node_id": "38000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você convoca Ana também.</p><p><strong>\"6 SEMANAS de thread no Slack. NINGUÉM me falou. Por quê?\"</strong></p><p>Silêncio desconfortável.</p>",
      "pressure_changes": ["confrontação"],
      "cognitive_tags": ["sistema1_assertivo", "cultura_accountability"]
    },
    {
      "text": "Mediar com total clareza: Eu sei tudo sobre ambos os lados",
      "next_node_id": "39000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Carlos, revisei tudo. Sei do Tech Review. Sei dos 6 semanas. Sei o que Ana fez. Sei o que você fez. Vamos resolver com FATOS.\"</strong></p><p>Carlos senta devagar. Você fez a lição de casa.</p>",
      "pressure_changes": ["autoridade_da_preparação"],
      "cognitive_tags": ["sistema2_preparado", "analitico", "justo"]
    }
  ]'::jsonb,
  '{"analytical_path": true, "preparation_pays_off": true}'::jsonb,
  2, false
);

-- ========== LEVEL 2: PATH 4 - Escalation (Failure Path) ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '24000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Carlos na porta - Perda de Controle</h3><p>Você ao telefone quando Carlos aparece 20min adiantado.</p><p><strong>Carlos:</strong> "Cheguei cedo. Você está... falando com alguém sobre mim?"</p><p>Ele vê Slack aberto: mensagem de Ana sobre demissão.</p><p><strong>Carlos (voz baixa):</strong> "Ah. Entendi. Você já escolheu o lado."</p><p>Ele vira para sair.</p><p class="text-red-600 font-semibold">Controle perdido. Recupera AGORA ou perde ambos.</p></div>',
  '{"time_limit": 15, "stakes": "maximum", "control": "lost"}'::jsonb,
  '[
    {
      "text": "Desligar RH e correr: CARLOS ESPERA! Eu fiz merda.",
      "next_node_id": "40000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você desliga sem explicar.</p><p><strong>\"CARLOS!\"</strong></p><p>Ele para no corredor. Pessoas olham.</p><p><strong>\"Volta. Não tomei lado. Tentei fazer certo e fiz merda. Me dá uma chance.\"</strong></p>",
      "pressure_changes": ["modo_recuperação"],
      "cognitive_tags": ["sistema1_recuperacao", "honestidade", "improvisacao"]
    },
    {
      "text": "Explicar imediatamente: Estava pedindo processo, não tomando lado",
      "next_node_id": "40000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Carlos, um segundo. Estava pedindo orientação sobre PROCESSO de mediação, não sobre você.\"</strong></p><p>Ele hesita. Clarificação rápida evita escalada.</p><p><strong>\"Posso explicar. Senta?\"</strong></p>",
      "pressure_changes": ["tentativa_clarificação"],
      "cognitive_tags": ["sistema2_racional", "explicacao", "controle_dano"]
    },
    {
      "text": "Deixar Carlos ir e terminar com RH (caminho de falha)",
      "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "consequence_text": "<p>Carlos sai. Pelo corredor: <em>\"Típico.\"</em></p><p>RH atende. Enquanto explica...</p><p>Slack de Ana: <em>\"Aceitei a proposta. Último dia: sexta.\"</em></p><p>15 dias até entrega. Perdeu ambos os talentos.</p><p><strong>CENÁRIO ENCERRADO: Falha de liderança crítica.</strong></p>",
      "pressure_changes": ["falha_catastrófica"],
      "cognitive_tags": ["sistema1_avesso_risco", "priorizacao_pobre", "resultado_falha"]
    }
  ]'::jsonb,
  '{"failure_path": true, "consequences_visible": true}'::jsonb,
  2, false
);

-- ========== LEVEL 3: DEEPER BRANCHES ==========

-- From 2.1.1: Authority Established
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '31000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Após estabelecer autoridade</h3><p>Silêncio. Ambos esperam você falar.</p><p><strong>Você tem o controle.</strong> Como estrutura a conversa?</p><p><strong>Ana:</strong> (respirando fundo, esperando)</p><p><strong>Carlos:</strong> (braços cruzados, mas atento)</p><p>Próximos 40 minutos definem se este conflito se resolve ou explode.</p></div>',
  '{"time_limit": 60, "stakes": "high", "control": "yours"}'::jsonb,
  '[
    {
      "text": "Ana fala primeiro (3min sem interrupção), depois Carlos",
      "next_node_id": "50000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Ana fala. Carlos ouve. Depois Carlos fala. Ana ouve.</p><p>Pela primeira vez em semanas, cada um ENTENDE o outro.</p><p>Não concordam, mas entendem.</p><p>Base para resolução estabelecida.</p>",
      "pressure_changes": ["mutual_understanding"],
      "cognitive_tags": ["sistema2_estruturado", "justica", "orientado_processo"]
    },
    {
      "text": "Fazer perguntas provocativas que forcem auto-reflexão",
      "next_node_id": "50000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Carlos, você confia na competência técnica de Ana?\"</strong></p><p>Carlos: \"Sim, ela é excelente—\"</p><p><strong>\"Ana, você acha que Carlos quer destruir seu trabalho?\"</strong></p><p>Ana: \"Não, eu acho que ele... quer melhorar...\"</p><p>Ponte construída.</p>",
      "pressure_changes": ["mudança_cognitiva"],
      "cognitive_tags": ["sistema2_socratico", "insight_psicologico", "descoberta_guiada"]
    },
    {
      "text": "Estabelecer acordo claro: Eu falo o problema, vocês propõem solução",
      "next_node_id": "50000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Eu descrevo o problema objetivamente. Vocês propõem solução juntos. 30 minutos. Começa agora.\"</strong></p><p>Estrutura clara + ownership compartilhado. Ambos engajam.</p>",
      "pressure_changes": ["estrutura_colaborativa"],
      "cognitive_tags": ["sistema2_facilitador", "empoderamento", "co_criacao"]
    }
  ]'::jsonb,
  '{"resolution_phase": true}'::jsonb,
  3, false
);

-- Continue with other Level 3 branches...
-- (For brevity, creating remaining nodes pointing to final)

INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES 
  ('32000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision', 
   '<p>Após catarse emocional, você vê o conflito real: Carlos se sente desvalorizado (novo na empresa), Ana se sente desrespeitada (8 anos ignorados).</p><p>Como transforma esse insight em ação?</p>', 
   '{"stakes": "high"}'::jsonb, 
   '[{"text": "Nomear o padrão: Vocês estão lutando por reconhecimento, não por arquitetura", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você nomeia o elefante na sala.</p><p>Ambos param. Reconhecem a verdade.</p><p>Não é sobre código. É sobre valor e respeito.</p>", "cognitive_tags": ["sistema2_insights", "profundidade_psicologica"]}, {"text": "Criar plano de reconhecimento mútuo: Ana mentora Carlos, Carlos traz inovação", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você propõe troca: Ana mentora técnica + Carlos lidera modernização.</p><p>Ambos veem valor. Ego transformado em colaboração.</p>", "cognitive_tags": ["sistema2_estrategico", "vitoria_mutua", "estruturado"]}, {"text": "Validar ambos emocionalmente primeiro, depois propor solução", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Ana, 8 anos merecem respeito. Carlos, suas ideias têm valor. Ambos certos.\"</p><p>Validação emocional abre caminho para acordo técnico.</p>", "cognitive_tags": ["sistema2_empatia", "validacao", "sequencial"]}]'::jsonb, 
   '{"emotional_intelligence": true}'::jsonb, 3, false),
   
  ('33000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Após reframing (GANHAR vs RESOLVER), ambos escolhem RESOLVER.</p><p>Você transformou dinâmica de conflito em dinâmica de solução de problema.</p>',
   '{"stakes": "medium"}'::jsonb,
   '[{"text": "Co-criar acordo: O que cada um precisa do outro?", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Ana: Preciso ser consultada antes de críticas públicas.</p><p>Carlos: Preciso que minhas ideias sejam consideradas seriamente.</p><p>Acordo alcançado.</p>", "cognitive_tags": ["sistema2_colaborativo"]}, {"text": "Escrever acordo formal com compromissos específicos de ambos", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você documenta: 1) Carlos consulta Ana antes de críticas. 2) Ana responde propostas em 48h. 3) Reuniões quinzenais.</p><p>Estrutura clara previne recaídas.</p>", "cognitive_tags": ["sistema2_estruturado", "orientado_processo", "responsabilidade_compartilhada"]}, {"text": "Testar acordo agora: Revisem juntos um PR polêmico", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você abre PR controverso. \"Resolvam isso na minha frente, jeito novo.\"</p><p>Praticam colaboração imediatamente. Funciona.</p>", "cognitive_tags": ["sistema1_orientado_acao", "experiencial", "confianca"]}]'::jsonb,
   '{}'::jsonb, 3, false),
   
  ('34000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Ana confia em você agora. Parceria estabelecida.</p><p>Carlos chega em 5 minutos. Como usa essa aliança com Ana para resolver o conflito?</p>',
   '{"time_limit": 30}'::jsonb,
   '[{"text": "Pedir permissão a Ana: Posso contar ao Carlos que você quer ficar?", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Ana concorda. Quando Carlos chega, você mostra que Ana quer resolver.</p><p>Carlos baixa defesas: \"Ela quer ficar? Eu achei que ela me odiava.\"</p>", "cognitive_tags": ["sistema2_etico", "transparencia"]}, {"text": "Mediar sem revelar detalhes: \"Ambos querem resolver, vamos focar nisso\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você mantém confidencialidade mas sinaliza abertura de ambos.</p><p>Carlos percebe clima diferente. Tensão diminui.</p>", "cognitive_tags": ["sistema2_estrategico", "confidencialidade", "diplomatico"]}, {"text": "Convocar mediação conjunta imediatamente (Ana + Carlos + você)", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Ana está ao seu lado quando Carlos chega. \"Carlos, Ana quer conversar.\"</p><p>Presença de Ana desarma Carlos. Conversa começa.</p>", "cognitive_tags": ["sistema1_decisivo", "confrontacao_direta", "confianca_alta"]}]'::jsonb,
   '{}'::jsonb, 3, false),
   
  ('35000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Evidências analisadas. Você viu: Carlos estava tecnicamente correto, mas o delivery foi humilhante.</p>',
   '{}'::jsonb,
   '[{"text": "Feedback para Carlos: Você está certo no WHAT, errado no HOW", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Quando Carlos chega: \"Revisei o Tech Review. Sua análise técnica estava correta. Sua abordagem foi destrutiva. Vamos separar conteúdo de método.\"</p>", "cognitive_tags": ["sistema2_nuancado", "habilidade_feedback"]}, {"text": "Mostrar evidências objetivas: \"Vou te mostrar o que vi\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você abre gravação do Tech Review. Carlos assiste sua própria performance.</p><p>\"Eu... não percebi o tom.\" Auto-reflexão ativada.</p>", "cognitive_tags": ["sistema2_baseado_evidencia", "ativador_autoconsciencia", "objetivo"]}, {"text": "Confrontar diretamente: \"Você humilhou Ana publicamente\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Carlos, o que você fez foi humilhação pública. Tecnicamente correto, humanamente inaceitável.\"</p><p>Carlos fica defensivo mas entende gravidade.</p>", "cognitive_tags": ["sistema1_direto", "confrontacional", "apostas_altas"]}]'::jsonb,
   '{}'::jsonb, 3, false);

-- Create remaining nodes (36-40)
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, decision_options, display_order, is_entry_node
) VALUES 
  ('36000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision', 
   '<p>Ana quer ficar. Informação crucial.</p>', 
   '[{"text": "Usar essa clareza para negociar com ambos", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você tem leverage. Ana quer ficar SE houver mudança. Carlos precisa ajustar estilo. Acordo viável existe.</p>", "cognitive_tags": ["sistema2_estrategico", "negociacao"]}, {"text": "Garantir compromisso de Ana: \"Você fica se eu resolver isso?\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Ana: \"Se houver mudança real, sim.\" Compromisso verbal obtido.</p><p>Você tem base sólida para mediar com Carlos.</p>", "cognitive_tags": ["sistema2_minucioso", "construcao_compromisso"]}, {"text": "Agir rápido: Convocar Carlos AGORA mesmo (10min antes)", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Carlos, pode vir agora?\" Urgência transmite seriedade.</p><p>Carlos chega em 2min. Momento de resolver.</p>", "cognitive_tags": ["sistema1_orientado_acao", "urgencia", "decisivo"]}]'::jsonb, 3, false),
   
  ('37000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Vulnerabilidade estabelece liderança.</p>',
   '[{"text": "E agora vamos corrigir JUNTOS", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Carlos: \"Se até você admite erro, posso admitir que fui duro demais com Ana.\"</p><p>Vulnerabilidade criou abertura.</p>", "cognitive_tags": ["sistema2_colaborativo", "vulnerabilidade"]}, {"text": "Criar sistema para evitar isso: \"Vou fazer check-ins semanais obrigatórios\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Falha foi minha. Novo sistema: 1:1 semanais com cada um + pulse da equipe.\"</p><p>Carlos aprecia estrutura preventiva.</p>", "cognitive_tags": ["sistema2_sistematico", "melhoria_processo", "preventivo"]}, {"text": "Pedir ajuda a Carlos: \"Me ajuda a consertar isso?\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Carlos, eu falhei. Mas você pode me ajudar a resolver com Ana?\"</p><p>Transformar Carlos em parte da solução. Ownership compartilhado.</p>", "cognitive_tags": ["sistema2_inclusivo", "empoderamento", "construcao_confianca"]}]'::jsonb, 3, false),
   
  ('38000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Confrontação sobre cultura de accountability.</p>',
   '[{"text": "Estabelecer nova norma: conflitos sobem ANTES de explodirem", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você cria novo processo: tensões reportadas em 1:1 semanal. Ambos concordam.</p>", "cognitive_tags": ["sistema2_sistematico", "preventivo", "mudanca_cultura"]}, {"text": "Responsabilizar ambos igualmente: \"Vocês dois falharam em escalar\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"6 semanas calados. Isso não é profissional. Ambos responsáveis.\"</p><p>Accountability compartilhado estabelecido.</p>", "cognitive_tags": ["sistema1_confrontacional", "responsabilidade_compartilhada", "direto"]}, {"text": "Focar em resolver agora, cultura depois: \"Ok, entendi. Vamos ao acordo\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você pivota de cultura para solução imediata.</p><p>\"Passado é passado. Como resolvemos AGORA?\"</p>", "cognitive_tags": ["sistema1_pragmatico", "foco_solucao", "pensamento_futuro"]}]'::jsonb, 3, false),
   
  ('39000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Preparação estabelece credibilidade.</p>',
   '[{"text": "Mostrar que ambos erraram E ambos têm razão", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Fairness absoluta desarma ambos. Base para resolução criada.</p>", "cognitive_tags": ["sistema2_equilibrado", "justica", "analitico"]}, {"text": "Apresentar timeline completo: \"Aqui está tudo que encontrei\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Você exibe timeline: 6 semanas, 47 mensagens, 12 PRs tensos.</p><p>Dados objetivos eliminam narrativas subjetivas.</p>", "cognitive_tags": ["sistema2_baseado_evidencia", "minucioso", "objetivo"]}, {"text": "Ir direto à solução: \"Sei de tudo. Vamos pular para o acordo?\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Revisei tudo. Ambos têm culpa. Pulemos debate e vamos ao acordo.\"</p><p>Eficiência sobre processo. Carlos aprecia pragmatismo.</p>", "cognitive_tags": ["sistema1_eficiente", "foco_solucao", "pragmatico"]}]'::jsonb, 3, false),
   
  ('40000000-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'decision',
   '<p>Recuperação in extremis. Carlos volta.</p>',
   '[{"text": "Honestidade radical: Eu não sabia o que fazer e paniquei", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>Carlos: \"Você... está sendo honesto. Ok. Vamos tentar de novo.\"</p><p>Recuperação bem-sucedida.</p>", "cognitive_tags": ["sistema2_vulneravel", "honestidade", "autentico"]}, {"text": "Explicar contexto: \"Estava ligando para RH sobre PROCESSO, não sobre você\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Carlos, você interpretou errado. Ligava sobre processo de mediação.\"</p><p>Clarificação reduz tensão. Carlos retorna.</p>", "cognitive_tags": ["sistema2_esclarecedor", "defensivo", "explicacao"]}, {"text": "Reconhecer erro e pivôtar: \"Fiz merda. Mas vamos resolver AGORA\"", "next_node_id": "50000000-0000-0000-0000-000000000001", "consequence_text": "<p>\"Sim, errei. Mas você está aqui. Vamos resolver?\" Ação > desculpas.</p><p>Carlos valoriza orientação para solução.</p>", "cognitive_tags": ["sistema1_orientado_acao", "recuperacao", "foco_futuro"]}]'::jsonb, 3, false);

-- ========== LEVEL 4: TEAM PHASE - Apresentar solução à equipe ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '50000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Reunião da Equipe - Quarta-feira, 10h</h3><p>Você resolveu Carlos e Ana. Mas a equipe inteira viu o conflito escalar por 6 semanas.</p><p><strong>Clima:</strong> Desconfiança mútua, produtividade caiu 40%, 3 pessoas já procurando outros jobs silenciosamente.</p><p><strong>Sua reunião:</strong> "Estado da liderança" - 45min com todo time.</p><p>Ana e Carlos estão sentados juntos (sinal positivo).</p><p><strong>Equipe espera: Você resolve isso agora ou terminamos em 2 meses?</strong></p></div>',
  '{"time_limit": 50, "stakes": "retention_team", "visibility": "all_team"}'::jsonb,
  '[
    {
      "text": "Honestidade radical: Eu falhei. Demorei demais. Vocês têm direito de desconfiar.",
      "next_node_id": "51000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Pessoal, antes de tudo: EU falhei como lider. Deixei conflito escalar quando deveria ter intervindo semana 2.\"</strong></p><p>Silêncio. Pessoas esperam você culpar alguém.</p><p><strong>\"Então é justo vocês desconfiarem. Vou mostrar como mudo isso.\"</strong></p><p>Confiança começa com accountability.</p>",
      "pressure_changes": ["vulnerabilidade_time"],
      "cognitive_tags": ["sistema2_autoconsciente", "accountability", "lideranca_honesto"]
    },
    {
      "text": "Explicar contexto técnico: A discordância era NORMAL, mal gerenciada",
      "next_node_id": "51000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"O conflito técnico entre arquitetura clássica (Ana) e modernização (Carlos) é SAUDÁVEL.\"</strong></p><p><strong>\"O problema foi como a gente debateu, não se devíamos debater.\"</strong></p><p>Recontextualiza conflito como processo normal. Reduz medo.</p>",
      "pressure_changes": ["normaliza_conflito"],
      "cognitive_tags": ["sistema2_estrategico", "contextualizacao", "lideranca_educativo"]
    },
    {
      "text": "Apresentar acordo Carlos/Ana como exemplo: Vocês viram que é possível resolver",
      "next_node_id": "51000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Ana e Carlos assinem na frente de todos.</p><p><strong>\"Eles chegaram em um acordo SEM compromisso. Pró-arquitetura híbrida, mentoria recíproca.\"</strong></p><p>Esperança concreta. Se eles conseguem, todos conseguem.</p>",
      "pressure_changes": ["exemplo_concreto"],
      "cognitive_tags": ["sistema1_demonstracao", "confianca_por_evidencia", "empoderacao"]
    }
  ]'::jsonb,
  '{"team_leadership": true, "psychological_safety": true}'::jsonb,
  4, false
);

-- ========== LEVEL 4: TEAM PHASE - Responder objeções ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '51000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Perguntas da Equipe - Linha reta</h3><p>Mão levantada: <strong>Dev Junior (3 anos)</strong></p><p><strong>\"Mas a solução híbrida seja só um adiar problemas? Qual a decisão REAL: Carlos tem razão ou Ana tem?\"</strong></p><p>Outra mão: <strong>Tech Lead 2 (não envolvido)</strong></p><p><strong>\"E se eles caírem em conflito de novo? Qual é o plano preventivo?\"</strong></p><p><strong>Terceira mão:</strong> <strong>QA Lead</strong></p><p><strong>\"Vocês sabem que o projeto está 3 dias atrás? Isso resolve até sexta?\"</strong></p><p>Pressão vindo de múltiplas direções.</p></div>',
  '{"time_limit": 45, "stakes": "credibility", "opposition": "multiple"}'::jsonb,
  '[
    {
      "text": "Responder tecnicamente: Arquitetura híbrida é tecnicamente viável E mais resiliente",
      "next_node_id": "52000000-0000-0000-0000-000000000001",
      "consequence_text": "<p>Você abre arquitetura na tela.</p><p><strong>\"Ana tem razão: essa base é sólida. Carlos tem razão: precisa virar escalável.\"</strong></p><p><strong>\"Solução: 3 semanas refatorando NODOs, não pilares. Melhor de ambos.\"</strong></p><p>Técnicos entendem. Credibilidade técnica restaurada.</p>",
      "pressure_changes": ["clareza_tecnica"],
      "cognitive_tags": ["sistema2_tecnico", "baseado_evidencia", "nuanceado"]
    },
    {
      "text": "Admitir que há risco, mas gestão de risco agora existe",
      "next_node_id": "52000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Sim, pode reexplodir. Por isso criamos: 1) Check-ins semanais obrigatórios. 2) Escalação automática no Slack. 3) Você (Tech Lead 2) media próximo conflito.\"</strong></p><p>Estrutura > esperança vaga.</p>",
      "pressure_changes": ["risco_reconhecido"],
      "cognitive_tags": ["sistema2_sistematico", "preventivo", "orientado_processo"]
    },
    {
      "text": "Focar no cronograma: Começa AMANHÃ, projeto no prazo SEXTA",
      "next_node_id": "52000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"QA Lead, você tem razão. 3 dias atrás. Ana e Carlos começam juntos AMANHÃ, 8h, sprint emergencial.\"</strong></p><p><strong>\"Sexta 18h você tem build completo.\"</strong></p><p>Action > discussion. Pressão diminui quando há plano concreto.</p>",
      "pressure_changes": ["orientado_acao"],
      "cognitive_tags": ["sistema1_decisivo", "urgencia_produtiva", "lideranca_executiva"]
    }
  ]'::jsonb,
  '{"technical_credibility": true, "team_confidence": true}'::jsonb,
  5, false
);

-- ========== LEVEL 4: TEAM PHASE - Alinhar expectativas de prazo ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '52000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Reunião com Board - Quinta, 15h</h3><p>Chefe chama você ao escritório.</p><p><strong>Chefe:</strong> "Board perguntou sobre release. Você conseguiu resolver Carlos e Ana?"</strong></p><p><strong>Contexto:</strong> Board espera resposta HOJE. Se disser "em resolução", ações caem. Se disser "resolvido", precisa entregar sexta.</p><p><strong>Você tem informação que Ana/Carlos estão colaborando sinceramente. Mas 3 dias de desenvolvimento é CURTO p/ refatoração.</strong></p><p>Qual mensagem você passa para Board?</p></div>',
  '{"time_limit": 30, "stakes": "maximum", "visibility": "executive"}'::jsonb,
  '[
    {
      "text": "Confiança total: Resolvido. Release no prazo, qualidade preservada.",
      "next_node_id": "53000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Pessoal, conflito resolvido. Equipe colaborando. Release sexta 18h, qualidade garantida.\"</strong></p><p>Risco: se falhar, você perde credibilidade para sempre.</p><p>Mas confiança inspira performance. Ana/Carlos se movem mais rápido com pressão útil.</p>",
      "pressure_changes": ["aposta_no_time"],
      "cognitive_tags": ["sistema1_confianca_alta", "lideranca_decisiva", "risco_calculado"]
    },
    {
      "text": "Honesto: Resolvido tecnicamente, mas 3 dias é curto. Vamos ao máximo.",
      "next_node_id": "53000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Conflito resolvido. Ana/Carlos alinhados. Mas honestamente: 3 dias para refatoração é apertado.\"</strong></p><p><strong>\"Prometo máximo esforço. Se não conseguirmos tudo, temos 80% pronto.\"</strong></p><p>Vulnerabilidade respeitosa. Board aprecia honestidade mais que falsa confiança.</p>",
      "pressure_changes": ["transparencia"],
      "cognitive_tags": ["sistema2_analitico", "honesto", "gerenciamento_expectativa"]
    },
    {
      "text": "Oferecer opção: Release completa sexta OU release parcial com qualidade",
      "next_node_id": "53000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Dois cenários: 1) Tudo sexta, mas podemos ter tech debt. 2) 80% sexta, 20% segunda com zero debt.\"</strong></p><p><strong>\"Vocês escolhem. Eu garanto o que prometo.\"</strong></p><p>Compartilhar decisão = compartilhar risco. Board responde melhor assim.</p>",
      "pressure_changes": ["decisao_compartilhada"],
      "cognitive_tags": ["sistema2_colaborativo", "strategic", "empoderacao_stakeholder"]
    }
  ]'::jsonb,
  '{"executive_alignment": true, "transparency_critical": true}'::jsonb,
  6, false
);

-- ========== LEVEL 4: TEAM PHASE - Validar comprometimento do time ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '53000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Quinta, 16h - Sprint Emergencial</h3><p>Time na sala. Ana na esquerda (código), Carlos na direita (review).</p><p>DevJr que fez objeção: <strong>\"Qual é o meu role nessa sprint de emergência?\"</strong></p><p>Tech Lead 2 (que mediaria). <strong>\"Eu continuo seus projetos ou foco em stabilidade?\"</strong></p><p>QA Lead: <strong>\"Preciso de testes automatizados sexta? Ou testamos manualmente?\"</strong></p><p><strong>Equipe inteira espera clareza de VOCÊ.</strong> Sem clareza, voltam a botar defeito em Ana/Carlos.</p><p>Você tem 5 minutos para estruturar.</p></div>',
  '{"time_limit": 20, "stakes": "execution", "clarity_needed": true}'::jsonb,
  '[
    {
      "text": "Designar papéis claros: Cada pessoa sabe EXATAMENTE o que fazer",
      "next_node_id": "54000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Ana: arquitetura + mentoria de Carlos. Carlos: refatoração + implementação. DevJr: você faz testes auto p/ esses módulos. QA: validação manual sexta à noite. Tech Lead 2: você monitora timebox, previne desvios.\"</strong></p><p>Clareza demanda. Pessoas se COMPROMETEM com papéis claros.</p>",
      "pressure_changes": ["clareza_alcancada"],
      "cognitive_tags": ["sistema2_estruturado", "delegacao_precisa", "empoderamento"]
    },
    {
      "text": "Criar ritual de standup: 9h/14h/17h, 10min, report de progresso",
      "next_node_id": "54000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"3 standups diários. 9h/14h/17h. Bloqueadores? Depedências? Risco? Report aqui.\"</strong></p><p>Ritual = commitment. Visibilidade constante. Trust rebuild.</p>",
      "pressure_changes": ["estrutura_ritual"],
      "cognitive_tags": ["sistema2_sistematico", "transparencia_continua", "gerenciamento_risco"]
    },
    {
      "text": "Apostar uma cerveja/comida: Se entregar tudo sexta, treat pra equipe",
      "next_node_id": "54000000-0000-0000-0000-000000000001",
      "consequence_text": "<p><strong>\"Se temos build completo sexta 18h, convido todo mundo para comer. Minha conta.\"</strong></p><p>Incentivo tangível + sinal que você ACREDITA neles. Psicologia: quando líder aposta, time se move.</p>",
      "pressure_changes": ["investimento_psicologico"],
      "cognitive_tags": ["sistema1_motivacao", "confianca_expressada", "lideranca_pessoal"]
    }
  ]'::jsonb,
  '{"commitment_validation": true, "trust_rebuild": true}'::jsonb,
  7, false
);

-- ========== LEVEL 4: TEAM PHASE - Resultado de impacto no time ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, decision_options, cognitive_markers, display_order, is_entry_node
) VALUES (
  '54000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'decision',
  '<div class="space-y-4"><h3 class="text-xl font-bold">Sexta, 18h - Sprint Encerrado</h3><p><strong>Resultado:</strong> Build completo. Tests passando. Ana/Carlos revisaram código juntos, sem conflito.</p><p>Tempo: <strong>3 dias</strong>. Meta atingida.</p><p>DevJr: <strong>\"Viram que é possível.\"</strong></p><p>Tech Lead 2 ao chefe: <strong>\"Acredito que liderança está resolvida.\"</strong></p><p>QA: <strong>\"Release pronto para produção.\"</strong></p><p><strong>Mas você está exausto. Peso de 6 semanas descendo.</strong></p><p>Como você encerra essa jornada?</p></div>',
  '{"completion_near": true, "emotional_release": true}'::jsonb,
  '[
    {
      "text": "Reunião de célula completa: celebrar, refletir, aprender (retrospectiva)",
      "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "consequence_text": "<p><strong>Time reunido. Você abre:</strong></p><p><strong>\"6 semanas de conflito. 3 dias de solução. Vocês foram EXTRAORDINÁRIOS. Vamos conversar sobre o que aprendemos?\"</strong></p><p>Time desabafa. Catarse positiva. Aprendizado coletivo. Cultura de resolução estabelecida.</p>",
      "pressure_changes": ["conclusao_com_aprendizado"],
      "cognitive_tags": ["sistema2_reflexivo", "aprendizado_coletivo", "lideranca_madura"]
    },
    {
      "text": "Reconhecimento individual: cada um recebe validação específica",
      "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "consequence_text": "<p><strong>\"Ana: sua expertise foi core da solução. Carlos: sua insistência em modernizar foi necessária. DevJr: seu teste foi crítico. Cada um foi essencial.\"</strong></p><p>Validação específica aprofunda comprometimento.</p>",
      "pressure_changes": ["reconhecimento_individual"],
      "cognitive_tags": ["sistema2_empathy", "specific_validation", "lideranca_inteligencia_emocional"]
    },
    {
      "text": "Deixar time em stand down: \"Vocês estão off amanhã e segunda. Descansem.\"",
      "next_node_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "consequence_text": "<p><strong>\"Projeto entregue. Vocês deram 110%. Off até terça.\"</strong></p><p>Lideres que cuidam de recuperação de time ganham lealdade de longo prazo.</p>",
      "pressure_changes": ["tempo_recuperacao"],
      "cognitive_tags": ["sistema2_cuidado", "bem_estar", "lideranca_humana"]
    }
  ]'::jsonb,
  '{"final_integration": true, "team_solidarity": true}'::jsonb,
  8, false
);

-- ========== FINAL NODE: Analysis Result ==========
INSERT INTO scenario_nodes (
  id, scenario_id, node_type, content, pressure_elements, cognitive_markers, display_order, is_entry_node
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'final',
  '<div class="space-y-6 text-center"><h2 class="text-3xl font-bold text-gray-900 mb-4">Simulação Concluída</h2><div class="max-w-2xl mx-auto"><p class="text-lg text-gray-600 mb-6">Analisando seus padrões cognitivos através da lente de <strong>Daniel Kahneman</strong> ("Thinking, Fast and Slow")</p><div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-indigo-200"><div class="flex items-center justify-center gap-3 mb-3"><span class="text-3xl">🧠</span><p class="font-bold text-lg text-indigo-900">Sistema 1 vs Sistema 2</p></div><p class="text-sm text-gray-700 leading-relaxed">Suas decisões revelam não apenas <em>o que</em> você escolheu, mas <strong>como você pensa</strong> sob pressão extrema.</p></div><p class="text-xs text-gray-500 mt-6 italic">Aguarde enquanto processamos sua jornada cognitiva...</p></div></div>',
  '{"completion": true}'::jsonb,
  '{"kahneman_analysis_trigger": true, "session_complete": true}'::jsonb,
  999, false
);

-- Verification
SELECT 
  id, 
  node_type,
  jsonb_array_length(decision_options) as num_options,
  cognitive_markers->>'kahneman_initial_test' as kahneman_test
FROM scenario_nodes
WHERE scenario_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
ORDER BY display_order;
