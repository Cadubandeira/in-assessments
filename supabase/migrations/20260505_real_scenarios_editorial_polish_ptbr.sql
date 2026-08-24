-- RealScenarios: revisao editorial cirurgica de copy e consistencia de linguagem PT-BR.
-- Foco: trechos identificados em teste de usabilidade.

-- 1) Ajustes em content dos nos
UPDATE public.scenario_nodes
SET content = REPLACE(content, 'Perguntas da Equipe - Linha reta', 'Perguntas da equipe - linha de frente')
WHERE content ILIKE '%Perguntas da Equipe - Linha reta%';

UPDATE public.scenario_nodes
SET content = REPLACE(content, 'Action > discussion.', 'Ação clara reduz incerteza e pressão no time.')
WHERE content ILIKE '%Action > discussion.%';

UPDATE public.scenario_nodes
SET content = REPLACE(content, 'Minha conta.', 'Por minha conta.')
WHERE content ILIKE '%Minha conta.%';

UPDATE public.scenario_nodes
SET content = REPLACE(content, ' Minha conta', ' Por minha conta')
WHERE content ILIKE '% Minha conta%';

UPDATE public.scenario_nodes
SET content = REPLACE(content, 'role nessa sprint de emergência?', 'papel nessa sprint de emergência?')
WHERE content ILIKE '%role nessa sprint de emergência?%';

-- 2) Ajustes em JSON de opcoes/consequencias
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
              REPLACE(
                REPLACE(
                  REPLACE(COALESCE(opt->>'text', ''),
                    'Action > discussion.',
                    'Ação clara reduz incerteza e pressão no time.'
                  ),
                  'Minha conta.',
                  'Por minha conta.'
                ),
                ' Minha conta',
                ' Por minha conta'
              ),
              'role nessa sprint de emergência?',
              'papel nessa sprint de emergência?'
            )
          ),
          true
        ),
        '{consequence_text}',
        to_jsonb(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(COALESCE(opt->>'consequence_text', ''),
                  'Action > discussion.',
                  'Ação clara reduz incerteza e pressão no time.'
                ),
                'Minha conta.',
                'Por minha conta.'
              ),
              ' Minha conta',
              ' Por minha conta'
            ),
            'role nessa sprint de emergência?',
            'papel nessa sprint de emergência?'
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

-- 3) Normalizacao opcional de header citado no teste em consequence_text
WITH normalized_consequence AS (
  SELECT
    id,
    jsonb_agg(
      jsonb_set(
        opt,
        '{consequence_text}',
        to_jsonb(
          REPLACE(
            COALESCE(opt->>'consequence_text', ''),
            'Perguntas da Equipe - Linha reta',
            'Perguntas da equipe - linha de frente'
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
SET decision_options = normalized_consequence.decision_options
FROM normalized_consequence
WHERE sn.id = normalized_consequence.id;
