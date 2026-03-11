-- Add show_indicator_intro configuration to assessment_versions
-- This controls whether to display the indicator/level introduction screens before showing questions

ALTER TABLE assessment_versions
ADD COLUMN show_indicator_intro boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN assessment_versions.show_indicator_intro IS 'Show/hide indicator or level introduction screens. When false, users skip directly to questions and only see overall progress (not per-indicator/level progress).';

-- Update existing assessment versions to have the default value (show introductions)
UPDATE assessment_versions
SET show_indicator_intro = true
WHERE show_indicator_intro IS NULL;
