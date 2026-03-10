-- ====================================================
-- FIX: Trigger para user_indicator_history com validação de schema
-- ====================================================
-- Este trigger resolve o erro de FK quando um assessment de tipo "niveis" é feito
-- Só insere em user_indicator_history se o assessment for do tipo "indicadores"
-- EXECUTE ISTO NO SUPABASE SQL EDITOR

-- 1. Criar função que insere em user_indicator_history de forma segura
CREATE OR REPLACE FUNCTION public.handle_assessment_events_insert()
RETURNS TRIGGER AS $$
DECLARE
  indicator_id_value uuid;
  indicator_name_value text;
  indicator_data jsonb;
BEGIN
  -- Apenas processa se assessment for do schema 'indicadores'
  IF NEW.assessment_schema != 'indicadores' THEN
    RETURN NEW;
  END IF;

  -- Se não há snapshot de indicadores, pular
  IF NEW.indicator_scores_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  -- Inserir um registro em user_indicator_history para cada indicador no snapshot
  -- Assumindo que indicator_scores_snapshot é um JSONB com formato:
  -- { "indicator_id": { "name": "...", "score": ..., "maxScore": ... }, ... }
  
  FOR indicator_id_value, indicator_name_value, indicator_data IN
    SELECT 
      (value->>'indicator_id')::uuid,
      coalesce(value->>'name', key),
      value
    FROM jsonb_each(NEW.indicator_scores_snapshot)
  LOOP
    -- Validar que indicator_id existe em indicators_master
    IF indicator_id_value IS NOT NULL AND 
       EXISTS (SELECT 1 FROM public.indicators_master WHERE id = indicator_id_value) THEN
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
        coalesce((indicator_data->>'score')::numeric, 0),
        coalesce((indicator_data->>'maxScore')::numeric, 0),
        coalesce((indicator_data->>'percentage')::numeric, 0),
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

-- 2. Criar trigger que chama a função
DROP TRIGGER IF EXISTS assessment_events_insert_trigger ON public.assessment_events;

CREATE TRIGGER assessment_events_insert_trigger
AFTER INSERT ON public.assessment_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_assessment_events_insert();

-- 3. Comentário explicativo
COMMENT ON TRIGGER assessment_events_insert_trigger ON public.assessment_events IS 
  'Inserts record in user_indicator_history after an assessment is completed. Only for schema="indicadores". Skips for schema="niveis" to avoid FK violations.';

-- ====================================================
-- VERIFICAÇÃO
-- ====================================================
-- Execute a query abaixo para verificar se o trigger está funcionando:

-- SELECT * FROM information_schema.triggers 
-- WHERE trigger_name = 'assessment_events_insert_trigger';

-- Ou verifique a última função criada:
-- SELECT proname, prosrc FROM pg_proc 
-- WHERE proname = 'handle_assessment_events_insert';
