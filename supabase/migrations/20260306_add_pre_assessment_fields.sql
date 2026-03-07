-- Migration: Adicionar suporte ao Pré-Assessment
-- Data: 2026-03-06
-- Descrição: Adiciona campos para configurar e armazenar dados de pré-assessment

-- Adicionar coluna pre_assessment_fields na tabela assessment_versions
-- Esta coluna armazena a configuração dos campos customizados do pré-assessment
ALTER TABLE assessment_versions 
ADD COLUMN IF NOT EXISTS pre_assessment_fields JSONB;

-- Adicionar coluna pre_assessment_data na tabela assessment_events
-- Esta coluna armazena as respostas do usuário aos campos de pré-assessment
ALTER TABLE assessment_events 
ADD COLUMN IF NOT EXISTS pre_assessment_data JSONB;

-- Comentários das colunas
COMMENT ON COLUMN assessment_versions.pre_assessment_fields IS 
'Campos customizados do pré-assessment configurados no AssessmentBuilder. 
Estrutura esperada: [{ id, label, type, is_required, placeholder, options }]';

COMMENT ON COLUMN assessment_events.pre_assessment_data IS 
'Respostas do usuário aos campos de pré-assessment. 
Estrutura esperada: { [field_id]: resposta_valor }';

-- Criar índice para consultas por dados de pré-assessment
CREATE INDEX IF NOT EXISTS idx_assessment_events_pre_assessment_data 
ON assessment_events USING gin (pre_assessment_data);

-- Nota: O índice GIN permite consultas eficientes em dados JSONB
-- Exemplo de consulta: WHERE pre_assessment_data @> '{"field-123": "valor"}'
