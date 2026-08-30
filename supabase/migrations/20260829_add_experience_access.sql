-- Access control for corporate users to experience dashboards
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL;

UPDATE public.profiles p
SET display_name = COALESCE(
  NULLIF(p.display_name, ''),
  NULLIF(au.raw_user_meta_data->>'display_name', ''),
  NULLIF(au.raw_user_meta_data->>'full_name', ''),
  NULLIF(au.raw_user_meta_data->>'name', ''),
  split_part(au.email, '@', 1)
)
FROM auth.users au
WHERE p.id = au.id
  AND (p.display_name IS NULL OR p.display_name = '');

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      display_name = COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        split_part(NEW.email, '@', 1),
        display_name
      )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email_from_auth ON auth.users;
CREATE TRIGGER trg_sync_profile_email_from_auth
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email_from_auth();

CREATE TABLE IF NOT EXISTS public.experience_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  application_session_id uuid NOT NULL REFERENCES public.assessment_application_sessions(id),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (user_id, application_session_id)
);

ALTER TABLE public.experience_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'experience_access'
      AND policyname = 'Admins manage experience access'
  ) THEN
    CREATE POLICY "Admins manage experience access"
      ON public.experience_access
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'experience_access'
      AND policyname = 'Corporate users view assigned experience access'
  ) THEN
    CREATE POLICY "Corporate users view assigned experience access"
      ON public.experience_access
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_experience_access_user_session
  ON public.experience_access(user_id, application_session_id, is_active);

COMMENT ON TABLE public.experience_access IS
  'Corporate user access grants to specific assessment application sessions considered experiences.';
