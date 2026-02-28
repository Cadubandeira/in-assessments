-- SQL commands to enable public read access for the Public Results page.
-- You can run this script in your Supabase SQL Editor.
-- Note: If Row Level Security (RLS) is already enabled on a table, the ALTER TABLE command is harmless.
-- If a policy with the same name already exists, you might get an error for that specific command, which you can safely ignore.

-- 1. Allows reading the main assessment event record
ALTER TABLE public.assessment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all assessment events"
ON public.assessment_events FOR SELECT USING (true);

-- 2. Allows reading the assessment version details
ALTER TABLE public.assessment_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all assessment versions"
ON public.assessment_versions FOR SELECT USING (true);

-- 3. Allows reading the main assessment details (name, description)
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all assessments"
ON public.assessments FOR SELECT USING (true);

-- 4. Allows reading the indicators linked to the assessment
ALTER TABLE public.assessment_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all assessment indicators"
ON public.assessment_indicators FOR SELECT USING (true);

-- 5. Allows reading the master data for indicators (name, icon, color)
ALTER TABLE public.indicators_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all indicators_master"
ON public.indicators_master FOR SELECT USING (true);

-- 6. Allows reading the classification ranges for each indicator
ALTER TABLE public.assessment_indicator_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all assessment indicator ranges"
ON public.assessment_indicator_ranges FOR SELECT USING (true);

-- 7. Allows reading conceptual descriptions from custom indicators
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all indicators"
ON public.indicators FOR SELECT USING (true);

-- 8. Allows reading the overall result classification ranges
ALTER TABLE public.assessment_overall_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to all assessment overall ranges"
ON public.assessment_overall_ranges FOR SELECT USING (true);
