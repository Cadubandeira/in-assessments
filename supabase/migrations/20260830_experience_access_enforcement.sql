-- Enforce the real access model for experience dashboards.
-- Admins can manage all profiles and session visibility.
-- Corporate users can only see experiences explicitly assigned to them.

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Admins read all profiles'
  ) THEN
    CREATE POLICY "Admins read all profiles"
      ON public.profiles
      FOR SELECT TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Admins update profiles'
  ) THEN
    CREATE POLICY "Admins update profiles"
      ON public.profiles
      FOR UPDATE TO authenticated
      USING (public.is_admin_user(auth.uid()))
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assessment_application_sessions'
      AND policyname = 'Corporate users read assigned sessions'
  ) THEN
    CREATE POLICY "Corporate users read assigned sessions"
      ON public.assessment_application_sessions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.experience_access ea
          WHERE ea.application_session_id = public.assessment_application_sessions.id
            AND ea.user_id = auth.uid()
            AND ea.is_active = true
        )
        OR public.is_admin_user(auth.uid())
      );
  END IF;
END $$;

-- Keep profile role values aligned with actual corporate assignment state.
CREATE OR REPLACE FUNCTION public.sync_experience_role_state()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET role = CASE
    WHEN p.role = 'admin' THEN 'admin'
    WHEN EXISTS (
      SELECT 1
      FROM public.experience_access ea
      WHERE ea.user_id = p.id
        AND ea.is_active = true
    ) THEN 'corporate'
    ELSE 'user'
  END
  WHERE p.role IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.sync_experience_role_state() IS
  'Reconciles profile roles with active experience access so the DB remains the source of truth.';

-- Idempotent helper to apply a complete access list for an experience without causing duplicate-key failures.
CREATE OR REPLACE FUNCTION public.replace_experience_access(p_application_session_id uuid, p_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_ids IS NULL THEN
    UPDATE public.experience_access
    SET is_active = false
    WHERE application_session_id = p_application_session_id
      AND is_active = true;
    RETURN;
  END IF;

  INSERT INTO public.experience_access (user_id, application_session_id, granted_by, is_active)
  SELECT unnest(p_user_ids), p_application_session_id, auth.uid(), true
  ON CONFLICT (user_id, application_session_id)
  DO UPDATE SET
    is_active = true,
    granted_by = EXCLUDED.granted_by,
    granted_at = now();

  UPDATE public.experience_access ea
  SET is_active = false
  WHERE ea.application_session_id = p_application_session_id
    AND ea.is_active = true
    AND NOT (ea.user_id = ANY (p_user_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.replace_experience_access(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_experience_access(uuid, uuid[]) TO authenticated;
