-- =============================================================================
-- FIX SECURITY ADVISOR — 2026-03-30
-- Resolve todos os erros e warnings reportados pelo Security Advisor do Supabase
--
-- NOTA: O item "Leaked Password Protection Disabled" NÃO pode ser corrigido via
-- SQL. Acesse: Supabase Dashboard → Authentication → Settings →
-- "Enable leaked password protection" e ative manualmente.
-- =============================================================================


-- =============================================================================
-- ERRO 1: RLS Disabled in Public — public.payable_payment_methods
-- O RLS precisa estar habilitado e com política segura (sem user_metadata)
-- =============================================================================
ALTER TABLE payable_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_isolation" ON payable_payment_methods;
CREATE POLICY "company_isolation" ON payable_payment_methods
  FOR ALL
  TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());


-- =============================================================================
-- ERRO 2: RLS references user metadata — public.measurements (4x)
-- A política usava auth.jwt() -> 'user_metadata' que é editável pelo usuário.
-- Substitui pela função segura SECURITY DEFINER public.my_company_id()
-- =============================================================================
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation measurements" ON measurements;
DROP POLICY IF EXISTS "company_isolation" ON measurements;
CREATE POLICY "company_isolation" ON measurements
  FOR ALL
  TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());


-- =============================================================================
-- ERRO 3: RLS references user metadata — public.bill_categories
-- Garante RLS habilitado e política segura nessa tabela
-- =============================================================================
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_isolation" ON bill_categories;
DROP POLICY IF EXISTS "Company isolation bill_categories" ON bill_categories;
CREATE POLICY "company_isolation" ON bill_categories
  FOR ALL
  TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());


-- =============================================================================
-- ERRO 4: RLS references user metadata — public.companies (2x)
-- Remove todas as políticas antigas que possam referenciar user_metadata
-- e recria apenas a política segura
-- =============================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop todas as políticas existentes para garantir estado limpo
DROP POLICY IF EXISTS "companies_select"    ON companies;
DROP POLICY IF EXISTS "company_isolation"   ON companies;
DROP POLICY IF EXISTS "Public Access"       ON companies;
DROP POLICY IF EXISTS "companies_update"    ON companies;
DROP POLICY IF EXISTS "companies_insert"    ON companies;
DROP POLICY IF EXISTS "companies_delete"    ON companies;

-- Recria somente a política de SELECT usando my_company_id()
CREATE POLICY "companies_select" ON companies
  FOR SELECT
  TO authenticated
  USING (id = public.my_company_id());


-- =============================================================================
-- WARNING 1: Function Search Path Mutable — public.update_updated_at_column
-- Adiciona SET search_path = '' para evitar search_path injection
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- WARNING 2: RLS Policy Always True — public.driver_locations
-- Substitui USING(true) / WITH CHECK(true) por isolamento real por empresa.
-- Mantém acesso anônimo apenas para leitura (rastreamento em tempo real),
-- mas restringe escrita ao usuário autenticado da mesma empresa.
-- =============================================================================
DROP POLICY IF EXISTS "Public Access"     ON driver_locations;
DROP POLICY IF EXISTS "company_isolation" ON driver_locations;

-- Leitura pública (necessário para exibir localização sem login de visitante)
CREATE POLICY "driver_locations_read" ON driver_locations
  FOR SELECT
  USING (true);

-- Escrita restrita por empresa
CREATE POLICY "driver_locations_write" ON driver_locations
  FOR ALL
  TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
