-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alternatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid,
  text text NOT NULL,
  score_value numeric NOT NULL,
  display_order integer NOT NULL,
  CONSTRAINT alternatives_pkey PRIMARY KEY (id),
  CONSTRAINT alternatives_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.assessment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid,
  assessment_version integer NOT NULL,
  user_id uuid NOT NULL,
  total_score numeric NOT NULL,
  max_possible_score numeric NOT NULL,
  classification_snapshot jsonb,
  indicator_scores_snapshot jsonb,
  answers_snapshot jsonb,
  executed_at timestamp without time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  user_display_name text,
  assessment_version_id uuid NOT NULL,
  CONSTRAINT assessment_events_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_events_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id)
);
CREATE TABLE public.assessment_indicator_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_indicator_id uuid,
  min_score numeric NOT NULL,
  max_score numeric NOT NULL,
  label text NOT NULL,
  interpretation text NOT NULL,
  display_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_indicator_ranges_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_indicator_ranges_assessment_indicator_id_fkey FOREIGN KEY (assessment_indicator_id) REFERENCES public.assessment_indicators(id)
);
CREATE TABLE public.assessment_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  indicator_master_id uuid,
  weight numeric DEFAULT 1,
  display_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  assessment_version_id uuid NOT NULL,
  CONSTRAINT assessment_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_indicators_indicator_master_id_fkey FOREIGN KEY (indicator_master_id) REFERENCES public.indicators_master(id)
);
CREATE TABLE public.assessment_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  version_number integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_versions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_versions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id)
);
CREATE TABLE public.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  aggregation_type text NOT NULL DEFAULT 'sum'::text,
  visualization_type text DEFAULT 'radar'::text,
  is_active boolean DEFAULT false,
  version integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  published_at timestamp without time zone,
  availability_type text NOT NULL DEFAULT 'free_for_all'::text CHECK (availability_type = ANY (ARRAY['free_for_all'::text, 'first_free'::text, 'paid_unlock'::text, 'subscription_only'::text])),
  CONSTRAINT assessments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid,
  name text NOT NULL,
  conceptual_description text,
  display_order integer NOT NULL,
  weight numeric DEFAULT 1.0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT indicators_pkey PRIMARY KEY (id),
  CONSTRAINT indicators_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id)
);
CREATE TABLE public.indicators_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT indicators_master_pkey PRIMARY KEY (id),
  CONSTRAINT indicators_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  indicator_id uuid,
  text text NOT NULL,
  is_required boolean DEFAULT true,
  display_order integer NOT NULL,
  response_type text DEFAULT 'single_choice'::text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.indicators(id)
);