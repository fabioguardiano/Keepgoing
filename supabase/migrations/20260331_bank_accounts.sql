-- =============================================================================
-- Contas Bancárias — cadastro de contas para destino de recebimentos/pagamentos
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  name        TEXT NOT NULL,
  bank_name   TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'corrente',
  agency      TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  pix_key     TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_accounts_company_isolation" ON bank_accounts;
CREATE POLICY "bank_accounts_company_isolation" ON bank_accounts
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
