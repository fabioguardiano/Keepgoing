-- Corrige as políticas RLS na tabela companies
-- Substitui verificação de auth.jwt que falhava pois user_metadata foi removido (ou alterado)
-- Mantém suporte ao ID nulo/zero para os mocks 

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_select" ON public.companies;
CREATE POLICY "company_select" ON public.companies
  FOR SELECT TO authenticated
  USING (
    id = public.my_company_id() OR id = '00000000-0000-0000-0000-000000000000'::uuid
  );

DROP POLICY IF EXISTS "company_update" ON public.companies;
CREATE POLICY "company_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    id = public.my_company_id() OR id = '00000000-0000-0000-0000-000000000000'::uuid
  )
  WITH CHECK (
    id = public.my_company_id() OR id = '00000000-0000-0000-0000-000000000000'::uuid
  );
