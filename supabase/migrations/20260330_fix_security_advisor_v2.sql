-- =============================================================================
-- FIX SECURITY ADVISOR v2 — 2026-03-30
-- Dropa TODAS as políticas existentes nas tabelas afetadas (independente do nome)
-- e recria apenas a política segura com public.my_company_id()
-- =============================================================================

-- Drop dinâmico de TODAS as políticas nas tabelas afetadas
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('measurements', 'bill_categories', 'companies', 'payable_payment_methods')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- =============================================================================
-- Recria políticas seguras (sem nenhuma referência a user_metadata)
-- =============================================================================

-- measurements
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON measurements
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- bill_categories
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON bill_categories
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- payable_payment_methods
ALTER TABLE payable_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON payable_payment_methods
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- companies — somente SELECT (empresa é lida, nunca inserida diretamente pelo usuário)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select" ON companies
  FOR SELECT TO authenticated
  USING (id = public.my_company_id());
