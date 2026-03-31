ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS staff                jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phases               jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deadline_warning_days int  DEFAULT 7,
  ADD COLUMN IF NOT EXISTS deadline_urgent_days  int  DEFAULT 3,
  ADD COLUMN IF NOT EXISTS idle_timeout_minutes  int  DEFAULT 15;
