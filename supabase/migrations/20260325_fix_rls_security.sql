-- =============================================================================
-- CORREÇÃO DE SEGURANÇA — RLS e Isolamento Multi-Tenant
-- Problema 1: public.companies sem RLS (tabela aberta)
-- Problema 2: todas as políticas usam auth.jwt()->'user_metadata' que é
--             editável pelo próprio usuário, permitindo falsificação de company_id
-- Solução: tabela profiles + função SECURITY DEFINER como lookup seguro
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA PROFILES — mapeamento seguro user → company
--    Populada automaticamente por trigger ao criar/atualizar usuário.
--    Só o service role (trigger SECURITY DEFINER) pode inserir/atualizar.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. TRIGGER — popula profiles ao criar/atualizar usuário no Supabase Auth
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, company_id)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data ->> 'company_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE
    SET company_id = (NEW.raw_user_meta_data ->> 'company_id')::uuid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_upsert ON auth.users;
CREATE TRIGGER on_auth_user_upsert
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();

-- Popula profiles para usuários já existentes
INSERT INTO public.profiles (id, company_id)
SELECT
  id,
  (raw_user_meta_data ->> 'company_id')::uuid
FROM auth.users
WHERE raw_user_meta_data ->> 'company_id' IS NOT NULL
ON CONFLICT (id) DO UPDATE
  SET company_id = EXCLUDED.company_id;

-- -----------------------------------------------------------------------------
-- 3. FUNÇÃO HELPER SEGURA — retorna company_id do usuário atual
--    SECURITY DEFINER: roda como dono da função (postgres), não como usuário.
--    SET search_path = '': evita search_path injection.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- 4. RLS — public.companies (estava completamente sem RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT
  TO authenticated
  USING (id = public.my_company_id());

-- -----------------------------------------------------------------------------
-- 5. ATUALIZA policies das tabelas com o loop original (brands, clients, etc.)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'clients', 'materials', 'products', 'sales', 'orders_service',
    'suppliers', 'architects', 'deliveries', 'activity_logs',
    'finance_transactions', 'brands'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "company_isolation" ON %I', t);
    EXECUTE format($p$
      CREATE POLICY "company_isolation" ON %I
      FOR ALL
      TO authenticated
      USING (company_id = public.my_company_id())
      WITH CHECK (company_id = public.my_company_id())
    $p$, t);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. ATUALIZA policies das tabelas financeiras
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payment_methods_company_isolation" ON payment_methods;
CREATE POLICY "payment_methods_company_isolation" ON payment_methods
  FOR ALL TO authenticated
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS "accounts_receivable_company_isolation" ON accounts_receivable;
CREATE POLICY "accounts_receivable_company_isolation" ON accounts_receivable
  FOR ALL TO authenticated
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS "accounts_payable_company_isolation" ON accounts_payable;
CREATE POLICY "accounts_payable_company_isolation" ON accounts_payable
  FOR ALL TO authenticated
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- -----------------------------------------------------------------------------
-- 7. ATUALIZA policies das ordens de serviço
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_work_orders" ON work_orders;
CREATE POLICY "tenant_work_orders" ON work_orders
  FOR ALL TO authenticated
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS "tenant_work_order_logs" ON work_order_logs;
CREATE POLICY "tenant_work_order_logs" ON work_order_logs
  FOR ALL TO authenticated
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
