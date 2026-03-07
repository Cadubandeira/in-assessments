-- Migration: Adicionar tabela de faixas de interpretação por nível
-- Data: 2026-03-06
-- Descrição: Permite configurar ranges de interpretação para cada nível baseado na pontuação bruta

-- Criar tabela assessment_level_ranges
CREATE TABLE IF NOT EXISTS assessment_level_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_level_id UUID NOT NULL REFERENCES assessment_levels(id) ON DELETE CASCADE,
  min_score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  label VARCHAR(255) NOT NULL,
  interpretation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para garantir que min_score <= max_score
  CONSTRAINT check_score_range CHECK (min_score <= max_score)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_level_ranges_level_id ON assessment_level_ranges(assessment_level_id);
CREATE INDEX IF NOT EXISTS idx_level_ranges_score ON assessment_level_ranges(assessment_level_id, min_score, max_score);

-- Comentários
COMMENT ON TABLE assessment_level_ranges IS 
'Faixas de interpretação por nível baseadas em pontuação bruta (não percentual). 
Similar a assessment_indicator_ranges mas para níveis.';

COMMENT ON COLUMN assessment_level_ranges.min_score IS 'Pontuação mínima da faixa (pontuação bruta, não percentual)';
COMMENT ON COLUMN assessment_level_ranges.max_score IS 'Pontuação máxima da faixa (pontuação bruta, não percentual)';
COMMENT ON COLUMN assessment_level_ranges.label IS 'Rótulo da faixa (ex: "Básico", "Intermediário", "Avançado")';
COMMENT ON COLUMN assessment_level_ranges.interpretation IS 'Texto de interpretação exibido para o usuário nesta faixa';
