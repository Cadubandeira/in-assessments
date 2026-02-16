-- Remover coluna display_order de assessment_indicator_ranges
-- Ranges são ordenadas por min_score/max_score, não por display_order
-- O usuário só vê a faixa na qual se enquadrou

ALTER TABLE public.assessment_indicator_ranges
DROP COLUMN IF EXISTS display_order;
