-- RealScenarios: backfill inicial de outcome_type para nos finais existentes.
-- Esta classificacao usa heuristicas de texto e deve ser revisada editorialmente por cenario.

-- 1) Garantir default neutro para finais sem classificacao.
UPDATE public.scenario_nodes
SET outcome_type = 'neutral'
WHERE node_type = 'final'
  AND (outcome_type IS NULL OR outcome_type = '');

-- 2) Marcar finais de insucesso (failure) por sinais de falha/escalacao.
UPDATE public.scenario_nodes
SET outcome_type = 'failure'
WHERE node_type = 'final'
  AND (
    lower(content) LIKE '%falha%'
    OR lower(content) LIKE '%fracasso%'
    OR lower(content) LIKE '%colapso%'
    OR lower(content) LIKE '%perda%'
    OR lower(content) LIKE '%atraso critico%'
    OR lower(content) LIKE '%conflito escalou%'
    OR lower(content) LIKE '%sem plano%'
    OR lower(content) LIKE '%crise aumentou%'
  );

-- 3) Marcar finais parciais (partial) por sinais de mitigacao incompleta.
UPDATE public.scenario_nodes
SET outcome_type = 'partial'
WHERE node_type = 'final'
  AND outcome_type = 'neutral'
  AND (
    lower(content) LIKE '%parcial%'
    OR lower(content) LIKE '%mitigou%'
    OR lower(content) LIKE '%melhora limitada%'
    OR lower(content) LIKE '%ainda ha risco%'
    OR lower(content) LIKE '%progresso, mas%'
  );

-- 4) Marcar finais de sucesso por sinais de resolucao.
UPDATE public.scenario_nodes
SET outcome_type = 'success'
WHERE node_type = 'final'
  AND outcome_type = 'neutral'
  AND (
    lower(content) LIKE '%resolvido%'
    OR lower(content) LIKE '%conflito resolvido%'
    OR lower(content) LIKE '%plano claro%'
    OR lower(content) LIKE '%entrega concluida%'
    OR lower(content) LIKE '%build completo%'
    OR lower(content) LIKE '%pressao diminui%'
  );

-- 5) Finais ainda neutros permanecem em revisao editorial.
