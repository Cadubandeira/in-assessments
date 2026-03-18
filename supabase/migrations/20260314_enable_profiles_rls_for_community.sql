ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles own select'
  ) THEN
    DROP POLICY "Profiles own select" ON public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles own insert'
  ) THEN
    DROP POLICY "Profiles own insert" ON public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles own update'
  ) THEN
    DROP POLICY "Profiles own update" ON public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles community read opted'
  ) THEN
    DROP POLICY "Profiles community read opted" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Profiles own select"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Profiles own insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles own update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles community read opted"
ON public.profiles
FOR SELECT
TO authenticated
USING (community_opt_in = true AND is_banned = false);