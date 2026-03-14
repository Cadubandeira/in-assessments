ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS show_deepening_card boolean;

ALTER TABLE public.assessment_versions
ADD COLUMN IF NOT EXISTS deepening_card_url text;

UPDATE public.assessment_versions
SET
  show_deepening_card = COALESCE(show_deepening_card, true),
  deepening_card_url = COALESCE(NULLIF(TRIM(deepening_card_url), ''), 'https://www.innernetworking.com.br/')
WHERE show_deepening_card IS NULL
   OR deepening_card_url IS NULL
   OR TRIM(deepening_card_url) = '';

ALTER TABLE public.assessment_versions
ALTER COLUMN show_deepening_card SET DEFAULT true;

COMMENT ON COLUMN public.assessment_versions.show_deepening_card IS 'Controls visibility of the deepening call-to-action card on results pages.';
COMMENT ON COLUMN public.assessment_versions.deepening_card_url IS 'Custom URL opened by the deepening call-to-action card.';