-- Add updated_at column to indicators_master table if it doesn't exist
ALTER TABLE public.indicators_master
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create or replace trigger to automatically update updated_at on any change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS set_updated_at_indicators_master ON public.indicators_master;

-- Create trigger to call the function on UPDATE
CREATE TRIGGER set_updated_at_indicators_master
BEFORE UPDATE ON public.indicators_master
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
