CREATE TABLE IF NOT EXISTS public.community_post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (reason = ANY (ARRAY['spam'::text, 'abuso'::text, 'conteudo_inadequado'::text, 'desinformacao'::text, 'outro'::text])),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'resolved'::text, 'dismissed'::text])),
  moderator_id uuid REFERENCES auth.users(id),
  moderator_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT community_post_reports_unique UNIQUE (post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_reports_status ON public.community_post_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_post_reports_post_id ON public.community_post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_reports_reporter_id ON public.community_post_reports(reporter_id);

ALTER TABLE public.community_post_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reports' AND policyname = 'Community reports select own'
  ) THEN
    DROP POLICY "Community reports select own" ON public.community_post_reports;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reports' AND policyname = 'Community reports insert own'
  ) THEN
    DROP POLICY "Community reports insert own" ON public.community_post_reports;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reports' AND policyname = 'Community reports admin select'
  ) THEN
    DROP POLICY "Community reports admin select" ON public.community_post_reports;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reports' AND policyname = 'Community reports admin update'
  ) THEN
    DROP POLICY "Community reports admin update" ON public.community_post_reports;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'Community posts admin select'
  ) THEN
    DROP POLICY "Community posts admin select" ON public.community_posts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'Community posts admin moderate'
  ) THEN
    DROP POLICY "Community posts admin moderate" ON public.community_posts;
  END IF;
END $$;

CREATE POLICY "Community reports select own"
ON public.community_post_reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "Community reports insert own"
ON public.community_post_reports
FOR INSERT
TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles reporter_profile
    JOIN public.community_posts post ON post.id = post_id
    JOIN public.profiles author_profile ON author_profile.id = post.author_id
    WHERE reporter_profile.id = auth.uid()
      AND reporter_profile.community_opt_in = true
      AND reporter_profile.is_banned = false
      AND post.is_deleted = false
      AND author_profile.community_opt_in = true
      AND author_profile.is_banned = false
  )
);

CREATE POLICY "Community reports admin select"
ON public.community_post_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "Community reports admin update"
ON public.community_post_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "Community posts admin select"
ON public.community_posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "Community posts admin moderate"
ON public.community_posts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
);