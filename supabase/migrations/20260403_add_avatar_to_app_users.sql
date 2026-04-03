ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
