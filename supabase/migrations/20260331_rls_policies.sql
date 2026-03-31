-- ============================================================
-- RLS (Row Level Security) — Isolamento multi-tenant
-- ============================================================
-- IMPORTANTE: Para que as políticas abaixo funcionem, o company_id
-- do usuário deve estar presente no JWT do Supabase Auth.
--
-- Configure isso em:
--   Supabase Dashboard → Authentication → Hooks (ou JWT Claims)
--
-- Exemplo de hook (PostgreSQL function) que injeta o claim:
--
--   CREATE OR REPLACE FUNCTION public.custom_jwt_claims()
--   RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
--   DECLARE
--     _company_id uuid;
--   BEGIN
--     SELECT company_id INTO _company_id
--     FROM public.app_users
--     WHERE id = auth.uid()
--     LIMIT 1;
--     RETURN jsonb_build_object('company_id', _company_id);
--   END;
--   $$;
--
--   -- Registrar em: Dashboard → Auth → JWT template (adicionar):
--   -- { "company_id": "{{ (select company_id from public.app_users where id = auth.uid()) }}" }
-- ============================================================

-- Helper: extrai company_id do JWT de forma segura
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'company_id', '')::uuid
$$;

-- ── companies ──────────────────────────────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_self_access" ON public.companies;
CREATE POLICY "company_self_access" ON public.companies
  FOR ALL
  USING (id = public.my_company_id())
  WITH CHECK (id = public.my_company_id());

-- ── app_users ──────────────────────────────────────────────
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.app_users;
CREATE POLICY "company_isolation" ON public.app_users
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── sales ──────────────────────────────────────────────────
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.sales;
CREATE POLICY "company_isolation" ON public.sales
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── clients ────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.clients;
CREATE POLICY "company_isolation" ON public.clients
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── architects ─────────────────────────────────────────────
ALTER TABLE public.architects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.architects;
CREATE POLICY "company_isolation" ON public.architects
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── suppliers ──────────────────────────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.suppliers;
CREATE POLICY "company_isolation" ON public.suppliers
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── materials ──────────────────────────────────────────────
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.materials;
CREATE POLICY "company_isolation" ON public.materials
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── products ───────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.products;
CREATE POLICY "company_isolation" ON public.products
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── work_orders ────────────────────────────────────────────
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.work_orders;
CREATE POLICY "company_isolation" ON public.work_orders
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── work_order_logs ────────────────────────────────────────
ALTER TABLE public.work_order_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.work_order_logs;
CREATE POLICY "company_isolation" ON public.work_order_logs
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── orders_service ─────────────────────────────────────────
ALTER TABLE public.orders_service ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.orders_service;
CREATE POLICY "company_isolation" ON public.orders_service
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── deliveries ─────────────────────────────────────────────
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.deliveries;
CREATE POLICY "company_isolation" ON public.deliveries
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── measurements ───────────────────────────────────────────
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.measurements;
CREATE POLICY "company_isolation" ON public.measurements
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── accounts_receivable ────────────────────────────────────
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.accounts_receivable;
CREATE POLICY "company_isolation" ON public.accounts_receivable
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── accounts_payable ───────────────────────────────────────
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.accounts_payable;
CREATE POLICY "company_isolation" ON public.accounts_payable
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── finance_transactions ───────────────────────────────────
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.finance_transactions;
CREATE POLICY "company_isolation" ON public.finance_transactions
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── payment_methods ────────────────────────────────────────
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.payment_methods;
CREATE POLICY "company_isolation" ON public.payment_methods
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── payment_types ──────────────────────────────────────────
ALTER TABLE public.payment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.payment_types;
CREATE POLICY "company_isolation" ON public.payment_types
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── payable_payment_methods ────────────────────────────────
ALTER TABLE public.payable_payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.payable_payment_methods;
CREATE POLICY "company_isolation" ON public.payable_payment_methods
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── bill_categories ────────────────────────────────────────
ALTER TABLE public.bill_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.bill_categories;
CREATE POLICY "company_isolation" ON public.bill_categories
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── activity_logs ──────────────────────────────────────────
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.activity_logs;
CREATE POLICY "company_isolation" ON public.activity_logs
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── discount_authorizations ────────────────────────────────
ALTER TABLE public.discount_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.discount_authorizations;
CREATE POLICY "company_isolation" ON public.discount_authorizations
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── driver_locations ───────────────────────────────────────
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON public.driver_locations;
CREATE POLICY "company_isolation" ON public.driver_locations
  FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
