-- ====================================================================
-- STAY UP CUSTOMER (CX) PROFILES & APPROVAL SCHEMA
-- Run this in your Supabase Dashboard -> SQL Editor
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.cx_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cx_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public can view own profile or query status" ON public.cx_profiles;
DROP POLICY IF EXISTS "Allow insert on sign up" ON public.cx_profiles;
DROP POLICY IF EXISTS "Allow update on approval" ON public.cx_profiles;

-- Policies
CREATE POLICY "Public can view own profile or query status"
  ON public.cx_profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow insert on sign up"
  ON public.cx_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Allow update on approval"
  ON public.cx_profiles
  FOR UPDATE
  TO authenticated, anon
  USING (true);

-- Auto-sync status back to auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_cx_approval_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{status}',
    to_jsonb(NEW.status)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_cx_profile_status_change ON public.cx_profiles;
CREATE TRIGGER on_cx_profile_status_change
  AFTER UPDATE OF status ON public.cx_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cx_approval_sync();
