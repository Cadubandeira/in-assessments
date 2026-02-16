-- ====================================================================
-- FIX: Adicionar Foreign Keys Faltantes
-- ====================================================================

-- 1. Adicionar FK: assessment_events.assessment_version_id -> assessment_versions.id
ALTER TABLE public.assessment_events
ADD CONSTRAINT assessment_events_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

-- 2. Adicionar FK: assessment_indicators.assessment_version_id -> assessment_versions.id
ALTER TABLE public.assessment_indicators
ADD CONSTRAINT assessment_indicators_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

-- ====================================================================
-- VERIFICAÇÃO: Confirmar constraints foram criadas
-- ====================================================================
-- Execute as queries abaixo no Supabase SQL Editor para confirmar

-- SELECT constraint_name, table_name 
-- FROM information_schema.table_constraints 
-- WHERE table_name IN ('assessment_events', 'assessment_indicators')
-- ORDER BY table_name;
