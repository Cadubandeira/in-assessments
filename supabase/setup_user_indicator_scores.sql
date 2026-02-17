-- Tabelas e funcoes para consolidar indicadores por usuario
-- Execute isso no Supabase SQL Editor

-- ============================================
-- 1. Tabela: user_indicator_scores (estado atual)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_indicator_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_id uuid NULL REFERENCES public.indicators_master(id) ON DELETE SET NULL,
  indicator_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  activity_type text,
  activity_name text,
  source_event_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_indicator_scores_unique UNIQUE (user_id, indicator_name)
);

-- Garantir unicidade correta com indicador_id quando disponivel
ALTER TABLE public.user_indicator_scores
  DROP CONSTRAINT IF EXISTS user_indicator_scores_unique;

CREATE UNIQUE INDEX IF NOT EXISTS user_indicator_scores_unique_id
  ON public.user_indicator_scores (user_id, indicator_id)
  WHERE indicator_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_indicator_scores_unique_name
  ON public.user_indicator_scores (user_id, indicator_name)
  WHERE indicator_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_indicator_scores_user_id
  ON public.user_indicator_scores (user_id);

CREATE INDEX IF NOT EXISTS idx_user_indicator_scores_indicator_name
  ON public.user_indicator_scores (indicator_name);

CREATE INDEX IF NOT EXISTS idx_user_indicator_scores_indicator_id
  ON public.user_indicator_scores (indicator_id);

-- ============================================
-- 2. Tabela: user_indicator_history (historico completo)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_indicator_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_id uuid NULL REFERENCES public.indicators_master(id) ON DELETE SET NULL,
  indicator_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  activity_type text,
  activity_name text,
  source_event_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_indicator_history_user_id
  ON public.user_indicator_history (user_id);

CREATE INDEX IF NOT EXISTS idx_user_indicator_history_indicator_name
  ON public.user_indicator_history (indicator_name);

-- ============================================
-- 3. Funcao: record_indicator_result
-- (pode ser usada por outras atividades no futuro)
-- ============================================
CREATE OR REPLACE FUNCTION public.record_indicator_result(
  p_user_id uuid,
  p_indicator_name text,
  p_score numeric,
  p_max_score numeric,
  p_percentage numeric DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_activity_name text DEFAULT NULL,
  p_source_event_id uuid DEFAULT NULL,
  p_indicator_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indicator_id uuid;
  v_percentage numeric;
BEGIN
  IF p_indicator_id IS NOT NULL THEN
    v_indicator_id := p_indicator_id;
  ELSE
    SELECT id INTO v_indicator_id
    FROM public.indicators_master
    WHERE name = p_indicator_name
    LIMIT 1;
  END IF;

  v_percentage := COALESCE(
    p_percentage,
    CASE WHEN p_max_score > 0 THEN ROUND((p_score / p_max_score) * 100, 0) ELSE 0 END
  );

  INSERT INTO public.user_indicator_history (
    user_id,
    indicator_id,
    indicator_name,
    score,
    max_score,
    percentage,
    activity_type,
    activity_name,
    source_event_id
  ) VALUES (
    p_user_id,
    v_indicator_id,
    COALESCE((SELECT name FROM public.indicators_master WHERE id = v_indicator_id), p_indicator_name),
    p_score,
    p_max_score,
    v_percentage,
    p_activity_type,
    p_activity_name,
    p_source_event_id
  );

  IF v_indicator_id IS NULL THEN
    INSERT INTO public.user_indicator_scores (
      user_id,
      indicator_id,
      indicator_name,
      score,
      max_score,
      percentage,
      activity_type,
      activity_name,
      source_event_id,
      updated_at
    ) VALUES (
      p_user_id,
      v_indicator_id,
      COALESCE((SELECT name FROM public.indicators_master WHERE id = v_indicator_id), p_indicator_name),
      p_score,
      p_max_score,
      v_percentage,
      p_activity_type,
      p_activity_name,
      p_source_event_id,
      now()
    )
    ON CONFLICT (user_id, indicator_name)
    WHERE indicator_id IS NULL
    DO UPDATE SET
      indicator_id = COALESCE(EXCLUDED.indicator_id, public.user_indicator_scores.indicator_id),
      indicator_name = COALESCE((SELECT name FROM public.indicators_master WHERE id = EXCLUDED.indicator_id), EXCLUDED.indicator_name),
      score = EXCLUDED.score,
      max_score = EXCLUDED.max_score,
      percentage = EXCLUDED.percentage,
      activity_type = EXCLUDED.activity_type,
      activity_name = EXCLUDED.activity_name,
      source_event_id = EXCLUDED.source_event_id,
      updated_at = now();
  ELSE
    INSERT INTO public.user_indicator_scores (
      user_id,
      indicator_id,
      indicator_name,
      score,
      max_score,
      percentage,
      activity_type,
      activity_name,
      source_event_id,
      updated_at
    ) VALUES (
      p_user_id,
      v_indicator_id,
      COALESCE((SELECT name FROM public.indicators_master WHERE id = v_indicator_id), p_indicator_name),
      p_score,
      p_max_score,
      v_percentage,
      p_activity_type,
      p_activity_name,
      p_source_event_id,
      now()
    )
    ON CONFLICT (user_id, indicator_id)
    WHERE indicator_id IS NOT NULL
    DO UPDATE SET
      indicator_id = COALESCE(EXCLUDED.indicator_id, public.user_indicator_scores.indicator_id),
      indicator_name = COALESCE((SELECT name FROM public.indicators_master WHERE id = EXCLUDED.indicator_id), EXCLUDED.indicator_name),
      score = EXCLUDED.score,
      max_score = EXCLUDED.max_score,
      percentage = EXCLUDED.percentage,
      activity_type = EXCLUDED.activity_type,
      activity_name = EXCLUDED.activity_name,
      source_event_id = EXCLUDED.source_event_id,
      updated_at = now();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_indicator_result(
  uuid, text, numeric, numeric, numeric, text, text, uuid, uuid
) TO authenticated;

-- ============================================
-- 4. Trigger: Atualizar indicadores a partir de assessment_events
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_assessment_event_indicators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_value jsonb;
  v_score numeric;
  v_max_score numeric;
  v_percentage numeric;
  v_indicator_id uuid;
  v_indicator_name text;
BEGIN
  IF NEW.indicator_scores_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(NEW.indicator_scores_snapshot)
  LOOP
    v_score := COALESCE((v_value->>'score')::numeric, 0);
    v_max_score := COALESCE((v_value->>'maxScore')::numeric, (v_value->>'max_score')::numeric, 0);
    v_percentage := COALESCE((v_value->>'percentage')::numeric, NULL);
    v_indicator_id := NULL;
    v_indicator_name := NULL;

    IF v_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      v_indicator_id := v_key::uuid;
      v_indicator_name := v_value->>'name';
    ELSE
      v_indicator_name := v_key;
      v_indicator_id := NULLIF((v_value->>'indicator_id')::uuid, NULL);
    END IF;

    PERFORM public.record_indicator_result(
      NEW.user_id,
      COALESCE(v_indicator_name, v_key),
      v_score,
      v_max_score,
      v_percentage,
      NEW.activity_type,
      NEW.activity_name,
      NEW.id,
      v_indicator_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_event_indicators ON public.assessment_events;

CREATE TRIGGER trg_assessment_event_indicators
AFTER INSERT ON public.assessment_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_assessment_event_indicators();

-- ============================================
-- 5. RLS Policies
-- ============================================
ALTER TABLE public.user_indicator_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_indicator_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their indicator scores" ON public.user_indicator_scores;
CREATE POLICY "Users can view their indicator scores" ON public.user_indicator_scores
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their indicator history" ON public.user_indicator_history;
CREATE POLICY "Users can view their indicator history" ON public.user_indicator_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
