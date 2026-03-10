-- Fix: avoid jsonb -> uuid operator in assessment_events trigger
-- Root cause: JSONB operator `->` does not accept UUID keys directly.
-- This function now reads score/maxScore/percentage from each iterated JSON value.

CREATE OR REPLACE FUNCTION public.handle_assessment_events_insert()
RETURNS TRIGGER AS $$
DECLARE
  indicator_id_value uuid;
  indicator_name_value text;
  indicator_data jsonb;
BEGIN
  IF NEW.assessment_schema != 'indicadores' THEN
    RETURN NEW;
  END IF;

  IF NEW.indicator_scores_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  FOR indicator_id_value, indicator_name_value, indicator_data IN
    SELECT
      (value->>'indicator_id')::uuid,
      COALESCE(value->>'name', key),
      value
    FROM jsonb_each(NEW.indicator_scores_snapshot)
  LOOP
    IF indicator_id_value IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.indicators_master WHERE id = indicator_id_value) THEN
      INSERT INTO public.user_indicator_history (
        user_id,
        indicator_id,
        indicator_name,
        score,
        max_score,
        percentage,
        activity_type,
        activity_name,
        source_event_id,
        created_at
      )
      VALUES (
        NEW.user_id,
        indicator_id_value,
        indicator_name_value,
        COALESCE((indicator_data->>'score')::numeric, 0),
        COALESCE((indicator_data->>'maxScore')::numeric, 0),
        COALESCE((indicator_data->>'percentage')::numeric, 0),
        NEW.activity_type,
        NEW.activity_name,
        NEW.id,
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
