-- =============================================================================
-- FIX: RLS references user metadata — public.app_users
-- Remove as 4 políticas que usam auth.jwt()->'user_metadata'
-- e recria usando public.my_company_id() (SECURITY DEFINER, seguro)
-- =============================================================================

-- Drop dinâmico de TODAS as políticas existentes em app_users
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_users', pol.policyname);
  END LOOP;
END $$;

-- Recria política única e segura
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON app_users
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
