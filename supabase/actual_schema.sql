-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alternatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid,
  text text NOT NULL,
  score_value numeric NOT NULL,
  display_order integer NOT NULL,
  score_target text CHECK (score_target IS NULL OR (score_target = ANY (ARRAY['level'::text, 'potential'::text]))),
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
  activity_type text NOT NULL DEFAULT 'assessment'::text CHECK (activity_type = ANY (ARRAY['assessment'::text, 'quiz'::text, 'certification'::text])),
  activity_name text NOT NULL,
  xp_awarded boolean DEFAULT false,
  assessment_schema text DEFAULT 'indicadores'::text CHECK (assessment_schema = ANY (ARRAY['indicadores'::text, 'niveis'::text])),
  pre_assessment_data jsonb,
  CONSTRAINT assessment_events_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_events_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id),
  CONSTRAINT assessment_events_assessment_version_id_fkey FOREIGN KEY (assessment_version_id) REFERENCES public.assessment_versions(id)
);
CREATE TABLE public.assessment_indicator_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_indicator_id uuid,
  min_score numeric NOT NULL,
  max_score numeric NOT NULL,
  label text NOT NULL,
  interpretation text NOT NULL,
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
  CONSTRAINT assessment_indicators_indicator_master_id_fkey FOREIGN KEY (indicator_master_id) REFERENCES public.indicators_master(id),
  CONSTRAINT assessment_indicators_assessment_version_id_fkey FOREIGN KEY (assessment_version_id) REFERENCES public.assessment_versions(id)
);
CREATE TABLE public.assessment_level_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_level_id uuid NOT NULL,
  min_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  label character varying NOT NULL,
  interpretation text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_level_ranges_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_level_ranges_assessment_level_id_fkey FOREIGN KEY (assessment_level_id) REFERENCES public.assessment_levels(id)
);
CREATE TABLE public.assessment_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_version_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL,
  description text,
  acquire_threshold numeric,
  potential_threshold numeric,
  created_at timestamp with time zone DEFAULT now(),
  not_acquired_title text,
  not_acquired_description text,
  CONSTRAINT assessment_levels_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_levels_assessment_version_id_fkey FOREIGN KEY (assessment_version_id) REFERENCES public.assessment_versions(id)
);
CREATE TABLE public.assessment_overall_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_version_id uuid NOT NULL,
  min_score numeric NOT NULL,
  max_score numeric NOT NULL,
  label text NOT NULL,
  interpretation text NOT NULL,
  CONSTRAINT assessment_overall_ranges_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_overall_ranges_version_fkey FOREIGN KEY (assessment_version_id) REFERENCES public.assessment_versions(id)
);
CREATE TABLE public.assessment_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  version_number integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  introduction_html text,
  visualization_type jsonb DEFAULT '["radar"]'::jsonb,
  final_reflection text,
  result_introduction text,
  schema text NOT NULL DEFAULT 'indicadores'::text CHECK (schema = ANY (ARRAY['indicadores'::text, 'niveis'::text])),
  level_mode text CHECK (level_mode IS NULL OR (level_mode = ANY (ARRAY['single'::text, 'multi'::text]))),
  pre_assessment_fields jsonb,
  no_level_achieved_title text,
  no_level_achieved_description text,
  gamify_xp boolean DEFAULT false,
  xp_completion numeric DEFAULT 0,
  xp_score_80_89 numeric DEFAULT 0,
  xp_score_90_99 numeric DEFAULT 0,
  xp_score_100 numeric DEFAULT 0,
  show_indicator_intro boolean DEFAULT true,
  show_level_badges boolean NOT NULL DEFAULT true,
  CONSTRAINT assessment_versions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_versions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id)
);
CREATE TABLE public.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  aggregation_type text NOT NULL DEFAULT 'sum'::text,
  visualization_type jsonb DEFAULT '["radar"]'::jsonb,
  is_active boolean DEFAULT false,
  version integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  published_at timestamp without time zone,
  availability_type text NOT NULL DEFAULT 'free_for_all'::text CHECK (availability_type = ANY (ARRAY['free_for_all'::text, 'first_free'::text, 'paid_unlock'::text, 'subscription_only'::text])),
  schema text NOT NULL DEFAULT 'indicadores'::text CHECK (schema = ANY (ARRAY['indicadores'::text, 'niveis'::text])),
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
  indicator_master_id uuid,
  CONSTRAINT indicators_pkey PRIMARY KEY (id),
  CONSTRAINT indicators_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id),
  CONSTRAINT indicators_indicator_master_id_fkey FOREIGN KEY (indicator_master_id) REFERENCES public.indicators_master(id)
);
CREATE TABLE public.indicators_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  color text DEFAULT '#6366F1'::text,
  icon text DEFAULT 'circle'::text,
  updated_at timestamp with time zone DEFAULT now(),
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
  level_id uuid,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.indicators(id),
  CONSTRAINT questions_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.assessment_levels(id)
);
CREATE TABLE public.scenario_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  node_id uuid NOT NULL,
  option_index integer NOT NULL,
  option_text text NOT NULL,
  time_to_decide_seconds integer,
  decision_confidence text CHECK (decision_confidence = ANY (ARRAY['uncertain'::text, 'moderate'::text, 'confident'::text])),
  cognitive_load_perceived text CHECK (cognitive_load_perceived = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scenario_decisions_pkey PRIMARY KEY (id),
  CONSTRAINT scenario_decisions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.scenario_sessions(id),
  CONSTRAINT scenario_decisions_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.scenario_nodes(id)
);
CREATE TABLE public.scenario_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL,
  node_type text NOT NULL CHECK (node_type = ANY (ARRAY['initial'::text, 'decision'::text, 'consequence'::text, 'final'::text])),
  content text NOT NULL,
  pressure_elements jsonb DEFAULT '{}'::jsonb,
  decision_options jsonb DEFAULT '[]'::jsonb,
  cognitive_markers jsonb DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_entry_node boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scenario_nodes_pkey PRIMARY KEY (id),
  CONSTRAINT scenario_nodes_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenario_simulations(id)
);
CREATE TABLE public.scenario_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scenario_id uuid NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  decision_path jsonb DEFAULT '[]'::jsonb,
  cognitive_patterns jsonb DEFAULT '{}'::jsonb,
  indicator_mapping jsonb DEFAULT '{}'::jsonb,
  total_time_seconds integer,
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])),
  CONSTRAINT scenario_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT scenario_sessions_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenario_simulations(id)
);
CREATE TABLE public.scenario_simulations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  initial_context text NOT NULL,
  target_indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  difficulty_level text NOT NULL DEFAULT 'medium'::text CHECK (difficulty_level = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  estimated_duration_minutes integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scenario_simulations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_indicator_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  indicator_id uuid,
  indicator_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  activity_type text,
  activity_name text,
  source_event_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_indicator_history_pkey PRIMARY KEY (id),
  CONSTRAINT user_indicator_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_indicator_history_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.indicators_master(id)
);
CREATE TABLE public.user_indicator_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  indicator_id uuid,
  indicator_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  activity_type text,
  activity_name text,
  source_event_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_indicator_scores_pkey PRIMARY KEY (id),
  CONSTRAINT user_indicator_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_indicator_scores_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.indicators_master(id)
);
CREATE TABLE public.user_progression (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  level integer DEFAULT 1 CHECK (level >= 1),
  total_xp integer DEFAULT 0 CHECK (total_xp >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_progression_pkey PRIMARY KEY (id),
  CONSTRAINT user_progression_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);