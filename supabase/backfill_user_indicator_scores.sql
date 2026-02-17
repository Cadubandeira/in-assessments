-- Backfill indicator_id and refresh indicator_name based on indicators_master
-- Execute isso no Supabase SQL Editor se tiver dados antigos

-- 1) Tentar mapear pelo nome atual em indicators_master
UPDATE public.user_indicator_scores u
SET indicator_id = im.id
FROM public.indicators_master im
WHERE u.indicator_id IS NULL
  AND u.indicator_name = im.name;

UPDATE public.user_indicator_history h
SET indicator_id = im.id
FROM public.indicators_master im
WHERE h.indicator_id IS NULL
  AND h.indicator_name = im.name;

-- 2) Fallback: mapear pelo nome antigo na tabela indicators
UPDATE public.user_indicator_scores u
SET indicator_id = i.indicator_master_id
FROM public.indicators i
WHERE u.indicator_id IS NULL
  AND u.indicator_name = i.name
  AND i.indicator_master_id IS NOT NULL;

UPDATE public.user_indicator_history h
SET indicator_id = i.indicator_master_id
FROM public.indicators i
WHERE h.indicator_id IS NULL
  AND h.indicator_name = i.name
  AND i.indicator_master_id IS NOT NULL;

-- 3) Atualizar nomes para o atual do indicators_master
UPDATE public.user_indicator_scores u
SET indicator_name = im.name
FROM public.indicators_master im
WHERE u.indicator_id = im.id
  AND u.indicator_name IS DISTINCT FROM im.name;

UPDATE public.user_indicator_history h
SET indicator_name = im.name
FROM public.indicators_master im
WHERE h.indicator_id = im.id
  AND h.indicator_name IS DISTINCT FROM im.name;
