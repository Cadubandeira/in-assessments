-- SQL Setup Instructions for Supabase
-- Execute these queries in the Supabase SQL Editor to set up the profiles table
-- https://supabase.com/dashboard/project/_/sql/new

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy - Users can read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Create RLS policy - Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Create RLS policy - Users can update their own profile (optional, for future admin functionality)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- NOTE: You should also set up an admin role in your application
-- and create a policy like:
-- CREATE POLICY "Admins can see all profiles"
-- ON profiles
-- FOR SELECT
-- USING (
--   (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
-- );

-- To manually set a user as admin, use:
-- UPDATE profiles SET role = 'admin' WHERE id = 'USER_ID_HERE';

-- ==================================================================
-- Admin policies: allow users with role='admin' to read all data
-- ==================================================================
-- Create helper function to check admin role without causing RLS recursion.
-- This function is SECURITY DEFINER so it executes with the privileges of its owner
-- and can read the `profiles` table without invoking RLS on the calling user's session.
-- You should ensure the function owner is a role with appropriate permissions (the SQL editor runs as a privileged user).
-- Ensure previous version removed so script can be re-run safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles"
ON profiles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==================================================================
-- Assessment events policies
-- Users can read their own assessment events; admins can read all
-- ==================================================================

-- Ensure table has RLS enabled (skip if already enabled)
ALTER TABLE IF EXISTS assessment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own assessment_events" ON assessment_events;
CREATE POLICY "Users can read their own assessment_events"
ON assessment_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all assessment_events" ON assessment_events;
CREATE POLICY "Admins can read all assessment_events"
ON assessment_events
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage assessment_events" ON assessment_events;
CREATE POLICY "Admins can manage assessment_events"
ON assessment_events
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Note:
-- After running these queries in Supabase SQL editor, you can promote a user to admin:
-- 1) Run: UPDATE profiles SET role = 'admin' WHERE id = 'USER_ID_HERE';
-- 2) Or insert a profile row for the user with role 'admin'.
