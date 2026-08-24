-- RealScenarios: base para finais de sucesso/insucesso + normalizacao textual inicial
-- Esta migration inicia a estrutura para desfechos e corrige trechos de linguagem
-- detectados em testes de usabilidade.

ALTER TABLE public.scenario_nodes
ADD COLUMN IF NOT EXISTS outcome_type text
CHECK (outcome_type IN ('success', 'partial', 'failure', 'neutral'))
DEFAULT 'neutral';

ALTER TABLE public.scenario_sessions
ADD COLUMN IF NOT EXISTS outcome_type text
CHECK (outcome_type IN ('success', 'partial', 'failure', 'neutral'))
DEFAULT 'neutral';

-- Ajustes diretos em blocos de conteudo dos nos
UPDATE public.scenario_nodes
SET content = REPLACE(content, 'Action > discussion.', 'Ação clara reduz incerteza e pressão no time.')
WHERE content ILIKE '%Action > discussion.%';

UPDATE public.scenario_nodes
SET content = REPLACE(content, 'Minha conta.', 'Por minha conta.')
WHERE content ILIKE '%Minha conta.%';

UPDATE public.scenario_nodes
SET content = REPLACE(content, 'role nessa sprint de emergência?', 'papel nessa sprint de emergência?')
WHERE content ILIKE '%role nessa sprint de emergência?%';

-- Ajustes em textos de alternativas e consequencias dentro do JSON decision_options
WITH normalized AS (
  SELECT
    id,
    jsonb_agg(
      jsonb_set(
        jsonb_set(
          opt,
          '{text}',
          to_jsonb(
            REPLACE(
              REPLACE(COALESCE(opt->>'text', ''), 'Minha conta.', 'Por minha conta.'),
              'Action > discussion.',
              'Ação clara reduz incerteza e pressão no time.'
            )
          ),
          true
        ),
        '{consequence_text}',
        to_jsonb(
          REPLACE(
            REPLACE(COALESCE(opt->>'consequence_text', ''), 'Action > discussion.', 'Ação clara reduz incerteza e pressão no time.'),
            'Minha conta.',
            'Por minha conta.'
          )
        ),
        true
      )
    ) AS decision_options
  FROM public.scenario_nodes,
  LATERAL jsonb_array_elements(COALESCE(public.scenario_nodes.decision_options, '[]'::jsonb)) opt
  GROUP BY id
)
UPDATE public.scenario_nodes sn
SET decision_options = normalized.decision_options
FROM normalized
WHERE sn.id = normalized.id;

-- Nota operacional:
-- A classificacao outcome_type por no final sera preenchida em migration de conteudo
-- orientada por roteiros (success/partial/failure) por cenario.
