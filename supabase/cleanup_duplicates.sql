-- CLEANUP: Remover assessments duplicados
-- Execute isso manualmente no Supabase SQL Editor

-- PASSO 1: Identificar assessments duplicados (mesmo nome)
-- (Execute apenas para ver quais você tem before deletando)
SELECT name, COUNT(*) as total, ARRAY_AGG(id) as ids
FROM public.assessments
GROUP BY name
HAVING COUNT(*) > 1;

-- PASSO 2: Deletar assessments duplicados (mantém apenas o primeiro/mais antigo)
WITH duplicates AS (
  SELECT id, name, created_at,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM public.assessments
)
DELETE FROM public.assessments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- PASSO 3: Verificar resultado - deve voltar a 0 duplicatas
SELECT name, COUNT(*) as total
FROM public.assessments
GROUP BY name
HAVING COUNT(*) > 1;

-- PASSO 4: Limpeza de órfãos (assessment_versions sem assessment)
DELETE FROM public.assessment_versions
WHERE assessment_id NOT IN (SELECT id FROM public.assessments);

-- PASSO 5: Confirmar quantos registros ficaram
SELECT COUNT(*) as total_assessments FROM public.assessments;
SELECT COUNT(*) as total_versions FROM public.assessment_versions;

