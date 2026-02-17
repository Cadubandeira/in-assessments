-- Create user_progression table for gamification system
CREATE TABLE IF NOT EXISTS user_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  level INT DEFAULT 1 CHECK (level >= 1),
  total_xp INT DEFAULT 0 CHECK (total_xp >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_progression_user_id ON user_progression(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_progression_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
DROP TRIGGER IF EXISTS tr_user_progression_timestamp ON user_progression;
CREATE TRIGGER tr_user_progression_timestamp
BEFORE UPDATE ON user_progression
FOR EACH ROW
EXECUTE FUNCTION update_user_progression_timestamp();

-- Enable RLS if needed
ALTER TABLE user_progression ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own progression
CREATE POLICY "Users can view own progression"
  ON user_progression FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progression"
  ON user_progression FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert/update progression"
  ON user_progression FOR ALL
  USING (auth.role() = 'service_role');
