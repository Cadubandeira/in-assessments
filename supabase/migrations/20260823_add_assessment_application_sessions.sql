-- Sessions created by admins for in-person or distributed assessment applications.
CREATE TABLE IF NOT EXISTS public.assessment_application_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token text NOT NULL UNIQUE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  assessment_version_id uuid NOT NULL REFERENCES public.assessment_versions(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE public.assessment_events
  ADD COLUMN IF NOT EXISTS application_session_id uuid
  REFERENCES public.assessment_application_sessions(id);

CREATE INDEX IF NOT EXISTS idx_assessment_events_application_session
  ON public.assessment_events(application_session_id, executed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_events_one_session_attempt
  ON public.assessment_events(application_session_id, user_id)
  WHERE application_session_id IS NOT NULL;

ALTER TABLE public.assessment_application_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assessment_application_sessions'
      AND policyname = 'Admins manage application sessions'
  ) THEN
    CREATE POLICY "Admins manage application sessions"
      ON public.assessment_application_sessions
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      ));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_application_session(p_token text)
RETURNS TABLE (
  id uuid,
  public_token text,
  assessment_id uuid,
  assessment_version_id uuid,
  name text,
  status text,
  expires_at timestamptz,
  assessment_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.public_token, s.assessment_id, s.assessment_version_id,
         s.name, s.status, s.expires_at, a.name
  FROM public.assessment_application_sessions s
  JOIN public.assessments a ON a.id = s.assessment_id
  WHERE s.public_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_application_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_application_session(text) TO anon, authenticated;

COMMENT ON TABLE public.assessment_application_sessions IS
  'Admin-created collection sessions that explicitly group assessment events.';