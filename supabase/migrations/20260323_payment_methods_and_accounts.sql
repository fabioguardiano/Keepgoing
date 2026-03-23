-- ============================================================
-- Formas de Pagamento
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'outro',
  type            TEXT NOT NULL DEFAULT 'avista',   -- 'avista' | 'aprazo'
  installments    INTEGER NOT NULL DEFAULT 1,
  installment_fee NUMERIC(8,4) NOT NULL DEFAULT 0,
  anticipation_discount NUMERIC(8,4) NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_company_isolation" ON payment_methods
  USING (company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'));

CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id);

-- ============================================================
-- Contas a Receber
-- ============================================================
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
  status              TEXT NOT NULL DEFAULT 'pendente',  -- pendente | parcial | quitado | cancelado
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_receivable_company_isolation" ON accounts_receivable
  USING (company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'));

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);

-- ============================================================
-- Contas a Pagar
-- ============================================================
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
  status              TEXT NOT NULL DEFAULT 'pendente',  -- pendente | parcial | quitado | cancelado
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_payable_company_isolation" ON accounts_payable
  USING (company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'));

CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);
