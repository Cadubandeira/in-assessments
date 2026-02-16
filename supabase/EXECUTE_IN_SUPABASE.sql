-- ====================================================================
-- ⚡ EXECUTAR ISTO NO SUPABASE SQL EDITOR
-- ====================================================================
-- 
-- URL: https://supabase.com/dashboard/project/_/sql/new
-- 
-- 1. Copie TODO o conteúdo abaixo
-- 2. Cole no editor SQL
-- 3. Clique em RUN (botão verde)
-- 4. Aguarde: "Execution completed successfully"
--
-- ====================================================================

-- Adicionar Foreign Key: assessment_events.assessment_version_id -> assessment_versions.id
-- Permite fazer JOIN entre as tabelas
ALTER TABLE public.assessment_events
ADD CONSTRAINT assessment_events_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

-- Adicionar Foreign Key: assessment_indicators.assessment_version_id -> assessment_versions.id
-- Conecta os indicadores específicos de cada versão
ALTER TABLE public.assessment_indicators
ADD CONSTRAINT assessment_indicators_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

-- ====================================================================
-- ✅ VALIDAÇÃO: Execute isto para confirmar que foi criado
-- ====================================================================
-- 
-- Você deve ver 2 constraints listadas:
-- 1. assessment_events_assessment_version_id_fkey
-- 2. assessment_indicators_assessment_version_id_fkey
--

SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('assessment_events', 'assessment_indicators')
  AND constraint_name LIKE '%version%'
ORDER BY table_name, constraint_name;

-- ====================================================================
-- PRONTO! 🎉
-- ====================================================================
-- A aplicação agora pode:
-- ✅ Salvar assessments com versão
-- ✅ Fazer JOIN entre assessment_events e assessment_versions
-- ✅ Exibir histórico com números de versão
-- ✅ Exibir resultados com versão fixa
-- ====================================================================
