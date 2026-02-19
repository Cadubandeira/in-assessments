-- Add xp_awarded field to track if XP has been processed for this assessment event
ALTER TABLE public.assessment_events 
ADD COLUMN IF NOT EXISTS xp_awarded boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assessment_events_xp_awarded 
ON public.assessment_events(xp_awarded);

-- Update existing records to true (assume all historical records already processed)
UPDATE public.assessment_events 
SET xp_awarded = true 
WHERE xp_awarded IS NULL;
