-- =============================================================================
-- GARANTE que as tabelas financeiras existem no banco.
-- Seguro para executar múltiplas vezes (CREATE TABLE IF NOT EXISTS).
-- Também corrige as políticas RLS para usar my_company_id() com fallback.
-- =============================================================================

-- ── Formas de Pagamento ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL DEFAULT 'outro',
  type                  TEXT NOT NULL DEFAULT 'avista',
  installments          INTEGER NOT NULL DEFAULT 1,
  installment_fee       NUMERIC(8,4) NOT NULL DEFAULT 0,
  anticipation_discount NUMERIC(8,4) NOT NULL DEFAULT 0,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_methods_company_isolation" ON payment_methods;
CREATE POLICY "payment_methods_company_isolation" ON payment_methods
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id);

-- ── Tipos de Pagamento (payable) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_types_company_isolation" ON payment_types;
CREATE POLICY "payment_types_company_isolation" ON payment_types
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── Contas a Receber ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL,
  description         TEXT NOT NULL,
  client_id           UUID,
  client_name         TEXT NOT NULL DEFAULT '',
  sale_id             UUID,
  order_number        TEXT NOT NULL DEFAULT '',
  total_value         NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_value          NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_value     NUMERIC(14,2) GENERATED ALWAYS AS (total_value - paid_value) STORED,
  installments        JSONB NOT NULL DEFAULT '[]',
  payment_method_id   UUID,
  payment_method_name TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'Venda',
  due_date            DATE NOT NULL,
  notes               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pendente',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_receivable_company_isolation" ON accounts_receivable;
CREATE POLICY "accounts_receivable_company_isolation" ON accounts_receivable
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company  ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_sale_id  ON accounts_receivable(sale_id);

-- ── Contas a Pagar ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_payable (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL,
  description         TEXT NOT NULL,
  supplier_id         UUID,
  supplier_name       TEXT NOT NULL DEFAULT '',
  total_value         NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_value          NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_value     NUMERIC(14,2) GENERATED ALWAYS AS (total_value - paid_value) STORED,
  installments        JSONB NOT NULL DEFAULT '[]',
  payment_method_id   UUID,
  payment_method_name TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'Fornecedor',
  due_date            DATE NOT NULL,
  notes               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pendente',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_payable_company_isolation" ON accounts_payable;
CREATE POLICY "accounts_payable_company_isolation" ON accounts_payable
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company  ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);

-- ── Categorias de Contas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'despesa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON bill_categories;
CREATE POLICY "company_isolation" ON bill_categories
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── Ordens de Serviço (work_orders) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  sale_id       UUID,
  order_number  TEXT,
  os_number     TEXT,
  status        TEXT NOT NULL DEFAULT 'em_aberto',
  phase         TEXT,
  client_name   TEXT,
  description   TEXT,
  items         JSONB DEFAULT '[]',
  delivery_date DATE,
  notes         TEXT,
  drawings      JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_work_orders" ON work_orders;
CREATE POLICY "tenant_work_orders" ON work_orders
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_sale_id ON work_orders(sale_id);

-- ── Medições ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL,
  sale_id      UUID,
  order_number TEXT,
  client_name  TEXT,
  address      TEXT,
  scheduled_at TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'agendada',
  notes        TEXT,
  technician   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON measurements;
CREATE POLICY "company_isolation" ON measurements
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_measurements_company ON measurements(company_id);

-- ── App Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id         UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  code       INTEGER,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'viewer',
  status     TEXT NOT NULL DEFAULT 'ativo',
  profile_id UUID,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON app_users;
CREATE POLICY "company_isolation" ON app_users
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_app_users_company ON app_users(company_id);
