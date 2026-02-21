-- =====================================================
-- Real Scenarios - Adaptive Simulation System
-- Simulação Adaptativa com IA + Pressão Contextual Real
-- =====================================================

-- Table 1: Scenario Simulations (Main Scenario Definition)
CREATE TABLE IF NOT EXISTS scenario_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  initial_context TEXT NOT NULL,
  target_indicators JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['lideranca', 'comunicacao', 'etica']
  difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  estimated_duration_minutes INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Scenario Nodes (Decision Points, Consequences, etc)
CREATE TABLE IF NOT EXISTS scenario_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenario_simulations(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('initial', 'decision', 'consequence', 'final')),
  content TEXT NOT NULL,
  pressure_elements JSONB DEFAULT '{}'::jsonb, -- { "time_limit": 60, "ambiguity": "high", "stakes": "critical" }
  decision_options JSONB DEFAULT '[]'::jsonb, -- [{ "text": "...", "next_node": "uuid", "indicators_weight": {...} }]
  cognitive_markers JSONB DEFAULT '{}'::jsonb, -- { "requires_analytical": true, "emotional_load": "high" }
  display_order INTEGER NOT NULL DEFAULT 0,
  is_entry_node BOOLEAN DEFAULT false, -- Marca o nó inicial do cenário
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenario_nodes_scenario_id ON scenario_nodes(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_nodes_entry ON scenario_nodes(scenario_id, is_entry_node) WHERE is_entry_node = true;

-- Table 3: Scenario Sessions (User's Journey Through a Scenario)
CREATE TABLE IF NOT EXISTS scenario_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_id UUID NOT NULL REFERENCES scenario_simulations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  decision_path JSONB DEFAULT '[]'::jsonb, -- Array of node IDs traversed
  cognitive_patterns JSONB DEFAULT '{}'::jsonb, -- Patterns identified during analysis
  indicator_mapping JSONB DEFAULT '{}'::jsonb, -- Mapping to indicators_master
  total_time_seconds INTEGER,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_scenario_sessions_user_id ON scenario_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_sessions_scenario_id ON scenario_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_sessions_status ON scenario_sessions(status);

-- Table 4: Scenario Decisions (Individual Decisions Made During Session)
CREATE TABLE IF NOT EXISTS scenario_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scenario_sessions(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES scenario_nodes(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL, -- Which option was chosen (0-based index)
  option_text TEXT NOT NULL, -- Store the text for historical record
  time_to_decide_seconds INTEGER,
  decision_confidence TEXT CHECK (decision_confidence IN ('uncertain', 'moderate', 'confident')),
  cognitive_load_perceived TEXT CHECK (cognitive_load_perceived IN ('low', 'medium', 'high')),
  metadata JSONB DEFAULT '{}'::jsonb, -- Any additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenario_decisions_session_id ON scenario_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_scenario_decisions_node_id ON scenario_decisions(node_id);

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE scenario_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_decisions ENABLE ROW LEVEL SECURITY;

-- Scenario Simulations: Everyone can read active scenarios
CREATE POLICY "scenario_simulations_select_active" ON scenario_simulations
  FOR SELECT
  USING (is_active = true);

-- Admin can do everything
CREATE POLICY "scenario_simulations_admin_all" ON scenario_simulations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Scenario Nodes: Everyone can read nodes of active scenarios
CREATE POLICY "scenario_nodes_select_active" ON scenario_nodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenario_simulations
      WHERE scenario_simulations.id = scenario_nodes.scenario_id
      AND scenario_simulations.is_active = true
    )
  );

-- Admin can do everything with nodes
CREATE POLICY "scenario_nodes_admin_all" ON scenario_nodes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Scenario Sessions: Users can only see their own sessions
CREATE POLICY "scenario_sessions_select_own" ON scenario_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "scenario_sessions_insert_own" ON scenario_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "scenario_sessions_update_own" ON scenario_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin can see all sessions
CREATE POLICY "scenario_sessions_admin_select" ON scenario_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Scenario Decisions: Users can only see/modify decisions from their own sessions
CREATE POLICY "scenario_decisions_select_own" ON scenario_decisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenario_sessions
      WHERE scenario_sessions.id = scenario_decisions.session_id
      AND scenario_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "scenario_decisions_insert_own" ON scenario_decisions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenario_sessions
      WHERE scenario_sessions.id = scenario_decisions.session_id
      AND scenario_sessions.user_id = auth.uid()
    )
  );

-- Admin can see all decisions
CREATE POLICY "scenario_decisions_admin_select" ON scenario_decisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- Triggers for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_scenario_simulations ON scenario_simulations;
CREATE TRIGGER set_timestamp_scenario_simulations
  BEFORE UPDATE ON scenario_simulations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get all active scenarios
CREATE OR REPLACE FUNCTION get_active_scenarios()
RETURNS SETOF scenario_simulations AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM scenario_simulations
  WHERE is_active = true
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get entry node for a scenario
CREATE OR REPLACE FUNCTION get_scenario_entry_node(p_scenario_id UUID)
RETURNS UUID AS $$
DECLARE
  v_node_id UUID;
BEGIN
  SELECT id INTO v_node_id
  FROM scenario_nodes
  WHERE scenario_id = p_scenario_id
  AND is_entry_node = true
  LIMIT 1;
  
  RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete a scenario session
CREATE OR REPLACE FUNCTION complete_scenario_session(
  p_session_id UUID,
  p_cognitive_patterns JSONB,
  p_indicator_mapping JSONB
)
RETURNS VOID AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_total_seconds INTEGER;
BEGIN
  -- Get start time
  SELECT started_at INTO v_started_at
  FROM scenario_sessions
  WHERE id = p_session_id;
  
  -- Calculate total time
  v_total_seconds := EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER;
  
  -- Update session
  UPDATE scenario_sessions
  SET 
    completed_at = NOW(),
    cognitive_patterns = p_cognitive_patterns,
    indicator_mapping = p_indicator_mapping,
    total_time_seconds = v_total_seconds,
    status = 'completed'
  WHERE id = p_session_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE scenario_simulations IS 'Main table defining adaptive scenarios';
COMMENT ON TABLE scenario_nodes IS 'Decision points and consequences within scenarios';
COMMENT ON TABLE scenario_sessions IS 'User sessions tracking journey through scenarios';
COMMENT ON TABLE scenario_decisions IS 'Individual decisions made by users during scenarios';

COMMENT ON COLUMN scenario_nodes.pressure_elements IS 'JSON defining time limits, ambiguity, stakes, etc.';
COMMENT ON COLUMN scenario_nodes.decision_options IS 'Array of choices with next node references and indicator weights';
COMMENT ON COLUMN scenario_nodes.cognitive_markers IS 'Markers for analytical/emotional/heuristic requirements';
COMMENT ON COLUMN scenario_sessions.cognitive_patterns IS 'Analyzed patterns: decision_speed, risk_profile, thinking_style, etc.';
COMMENT ON COLUMN scenario_sessions.indicator_mapping IS 'Mapping of cognitive patterns to indicators_master';
