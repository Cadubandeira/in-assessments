CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 500),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type = ANY (ARRAY['like'::text, 'celebrate'::text, 'support'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id),
  following_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT community_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT community_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_post_reactions_post_id ON public.community_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_follower_id ON public.community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following_id ON public.community_follows(following_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'Community posts select eligible'
  ) THEN
    DROP POLICY "Community posts select eligible" ON public.community_posts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'Community posts insert own'
  ) THEN
    DROP POLICY "Community posts insert own" ON public.community_posts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'Community posts update own'
  ) THEN
    DROP POLICY "Community posts update own" ON public.community_posts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'Community posts delete own'
  ) THEN
    DROP POLICY "Community posts delete own" ON public.community_posts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reactions' AND policyname = 'Community reactions select eligible'
  ) THEN
    DROP POLICY "Community reactions select eligible" ON public.community_post_reactions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reactions' AND policyname = 'Community reactions insert own'
  ) THEN
    DROP POLICY "Community reactions insert own" ON public.community_post_reactions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reactions' AND policyname = 'Community reactions update own'
  ) THEN
    DROP POLICY "Community reactions update own" ON public.community_post_reactions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_post_reactions' AND policyname = 'Community reactions delete own'
  ) THEN
    DROP POLICY "Community reactions delete own" ON public.community_post_reactions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_follows' AND policyname = 'Community follows select own'
  ) THEN
    DROP POLICY "Community follows select own" ON public.community_follows;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_follows' AND policyname = 'Community follows insert own'
  ) THEN
    DROP POLICY "Community follows insert own" ON public.community_follows;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_follows' AND policyname = 'Community follows delete own'
  ) THEN
    DROP POLICY "Community follows delete own" ON public.community_follows;
  END IF;
END $$;

CREATE POLICY "Community posts select eligible"
ON public.community_posts
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND EXISTS (
    SELECT 1 FROM public.profiles viewer
    WHERE viewer.id = auth.uid() AND viewer.community_opt_in = true AND viewer.is_banned = false
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles author_profile
    WHERE author_profile.id = author_id AND author_profile.community_opt_in = true AND author_profile.is_banned = false
  )
);

CREATE POLICY "Community posts insert own"
ON public.community_posts
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.community_opt_in = true AND p.is_banned = false
  )
);

CREATE POLICY "Community posts update own"
ON public.community_posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Community posts delete own"
ON public.community_posts
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Community reactions select eligible"
ON public.community_post_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.community_posts post
    JOIN public.profiles author_profile ON author_profile.id = post.author_id
    JOIN public.profiles viewer_profile ON viewer_profile.id = auth.uid()
    WHERE post.id = post_id
      AND post.is_deleted = false
      AND author_profile.community_opt_in = true
      AND author_profile.is_banned = false
      AND viewer_profile.community_opt_in = true
      AND viewer_profile.is_banned = false
  )
);

CREATE POLICY "Community reactions insert own"
ON public.community_post_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.community_posts post
    JOIN public.profiles viewer_profile ON viewer_profile.id = auth.uid()
    JOIN public.profiles author_profile ON author_profile.id = post.author_id
    WHERE post.id = post_id
      AND post.is_deleted = false
      AND viewer_profile.community_opt_in = true
      AND viewer_profile.is_banned = false
      AND author_profile.community_opt_in = true
      AND author_profile.is_banned = false
  )
);

CREATE POLICY "Community reactions update own"
ON public.community_post_reactions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Community reactions delete own"
ON public.community_post_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Community follows select own"
ON public.community_follows
FOR SELECT
TO authenticated
USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Community follows insert own"
ON public.community_follows
FOR INSERT
TO authenticated
WITH CHECK (
  follower_id = auth.uid()
  AND follower_id <> following_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.community_opt_in = true AND p.is_banned = false
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id = following_id AND target.community_opt_in = true AND target.is_banned = false
  )
);

CREATE POLICY "Community follows delete own"
ON public.community_follows
FOR DELETE
TO authenticated
USING (follower_id = auth.uid());