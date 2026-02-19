-- Migration: Add visualization_type to assessment_versions
-- Permite que cada versão de um assessment tenha sua própria configuração de visualização

-- Adicionar coluna visualization_type à tabela assessment_versions
ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS visualization_type jsonb DEFAULT '["radar"]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.assessment_versions.visualization_type IS 'Tipo(s) de visualização para esta versão do assessment. Array de strings: ["radar", "horizontal-bar"]';

-- Copiar valores existentes de assessments para suas respectivas versões
-- Isto garante que todas as versões comecem com a mesma configuração do assessment pai
UPDATE public.assessment_versions av
SET visualization_type = COALESCE(a.visualization_type, '["radar"]'::jsonb)
FROM public.assessments a
WHERE av.assessment_id = a.id;

-- Criar índice para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_assessment_versions_visualization_type 
ON public.assessment_versions USING gin (visualization_type);

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: visualization_type added to assessment_versions';
END $$;
