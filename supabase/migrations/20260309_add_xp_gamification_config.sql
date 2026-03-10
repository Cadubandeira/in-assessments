-- Add XP Gamification Configuration to assessment_versions
-- This allows enabling/disabling XP rewards and configuring different XP amounts per performance level

ALTER TABLE assessment_versions
ADD COLUMN gamify_xp boolean DEFAULT false,
ADD COLUMN xp_completion numeric DEFAULT 0,
ADD COLUMN xp_score_80_89 numeric DEFAULT 0,
ADD COLUMN xp_score_90_99 numeric DEFAULT 0,
ADD COLUMN xp_score_100 numeric DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN assessment_versions.gamify_xp IS 'Enable/disable XP rewards for this assessment version';
COMMENT ON COLUMN assessment_versions.xp_completion IS 'XP awarded for completing the assessment (required when gamify_xp=true)';
COMMENT ON COLUMN assessment_versions.xp_score_80_89 IS 'Bonus XP for 80-89% result';
COMMENT ON COLUMN assessment_versions.xp_score_90_99 IS 'Bonus XP for 90-99% result';
COMMENT ON COLUMN assessment_versions.xp_score_100 IS 'Bonus XP for 100% result';
