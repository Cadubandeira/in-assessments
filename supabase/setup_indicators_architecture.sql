-- ============================================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABELA: indicators_master
-- Indicadores reutilizáveis globalmente
-- ============================================================

CREATE TABLE IF NOT EXISTS indicators_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indicators_master_name
ON indicators_master(name);

-- ============================================================
-- 2. ALTER TABLE assessments
-- Adiciona controle de disponibilização comercial
-- ============================================================

ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS availability_type TEXT NOT NULL DEFAULT 'free_for_all';

ALTER TABLE assessments
ADD CONSTRAINT assessments_availability_check
CHECK (availability_type IN (
  'free_for_all',
  'first_free',
  'paid_unlock',
  'subscription_only'
));

-- ============================================================
-- 3. TABELA: assessment_indicators
-- Associa indicadores ao assessment
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  indicator_master_id UUID NOT NULL REFERENCES indicators_master(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  max_possible_score INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id, indicator_master_id),
  CHECK (max_possible_score > 0)
);

CREATE INDEX IF NOT EXISTS idx_assessment_indicators_assessment
ON assessment_indicators(assessment_id);

-- ============================================================
-- 4. TABELA: assessment_indicator_ranges
-- Faixas dinâmicas por indicador dentro do assessment
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_indicator_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_indicator_id UUID NOT NULL 
    REFERENCES assessment_indicators(id) ON DELETE CASCADE,

  min_score INT NOT NULL,
  max_score INT NOT NULL,
  label TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (min_score >= 0),
  CHECK (max_score >= 0),
  CHECK (min_score <= max_score),

  UNIQUE (assessment_indicator_id, min_score, max_score)
);

CREATE INDEX IF NOT EXISTS idx_ranges_assessment_indicator
ON assessment_indicator_ranges(assessment_indicator_id);

-- ============================================================
-- 5. TRIGGER updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_indicators_master ON indicators_master;

CREATE TRIGGER trigger_update_indicators_master
BEFORE UPDATE ON indicators_master
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE indicators_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_indicator_ranges ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- ========== indicators_master ==========
DROP POLICY IF EXISTS "read_indicators_master" ON indicators_master;
CREATE POLICY "read_indicators_master"
ON indicators_master
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_indicators_master" ON indicators_master;
CREATE POLICY "admin_manage_indicators_master"
ON indicators_master
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========== assessment_indicators ==========
DROP POLICY IF EXISTS "read_assessment_indicators" ON assessment_indicators;
CREATE POLICY "read_assessment_indicators"
ON assessment_indicators
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_assessment_indicators" ON assessment_indicators;
CREATE POLICY "admin_manage_assessment_indicators"
ON assessment_indicators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========== assessment_indicator_ranges ==========
DROP POLICY IF EXISTS "read_assessment_indicator_ranges" ON assessment_indicator_ranges;
CREATE POLICY "read_assessment_indicator_ranges"
ON assessment_indicator_ranges
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_assessment_indicator_ranges" ON assessment_indicator_ranges;
CREATE POLICY "admin_manage_assessment_indicator_ranges"
ON assessment_indicator_ranges
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
