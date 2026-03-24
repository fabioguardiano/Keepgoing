-- ============================================================
-- MÓDULO FINANCEIRO COMPLETO — KeepGoing
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. FORMAS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS payment_methods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'outro',
  type          TEXT NOT NULL DEFAULT 'avista' CHECK (type IN ('avista','aprazo')),
  installments          INTEGER DEFAULT 1,
  installment_fee       DECIMAL(6,4) DEFAULT 0,   -- taxa % por parcela
  anticipation_discount DECIMAL(6,4) DEFAULT 0,   -- % desconto antecipação
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_methods_company" ON payment_methods;
CREATE POLICY "payment_methods_company" ON payment_methods
  USING (company_id = (SELECT company_id FROM users_profiles WHERE id = auth.uid())
         OR company_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_pm_company ON payment_methods(company_id);

-- 2. CONTAS A RECEBER
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  description         TEXT NOT NULL DEFAULT '',
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name         TEXT DEFAULT '',
  sale_id             UUID REFERENCES sales(id) ON DELETE SET NULL,
  order_number        TEXT DEFAULT '',
  total_value         DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_value          DECIMAL(14,2) NOT NULL DEFAULT 0,
  remaining_value     DECIMAL(14,2) GENERATED ALWAYS AS (total_value - paid_value) STORED,
  installments        JSONB DEFAULT '[]',
  payment_method_id   UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  payment_method_name TEXT DEFAULT '',
  category            TEXT DEFAULT 'Venda',
  due_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','parcial','quitado','cancelado')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ar_company" ON accounts_receivable;
CREATE POLICY "ar_company" ON accounts_receivable
  USING (company_id = (SELECT company_id FROM users_profiles WHERE id = auth.uid())
         OR company_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_ar_company    ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_ar_status     ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_ar_due_date   ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_client     ON accounts_receivable(client_id);

-- 3. CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS accounts_payable (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  description         TEXT NOT NULL DEFAULT '',
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name       TEXT DEFAULT '',
  total_value         DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_value          DECIMAL(14,2) NOT NULL DEFAULT 0,
  remaining_value     DECIMAL(14,2) GENERATED ALWAYS AS (total_value - paid_value) STORED,
  installments        JSONB DEFAULT '[]',
  payment_method_id   UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  payment_method_name TEXT DEFAULT '',
  category            TEXT DEFAULT 'Fornecedor',
  due_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','parcial','quitado','cancelado')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ap_company" ON accounts_payable;
CREATE POLICY "ap_company" ON accounts_payable
  USING (company_id = (SELECT company_id FROM users_profiles WHERE id = auth.uid())
         OR company_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_ap_company    ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_ap_status     ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date   ON accounts_payable(due_date);

-- ============================================================
-- FORMAS DE PAGAMENTO PADRÃO (inserir após criar a tabela)
-- Substitua 'SEU_COMPANY_ID' pelo UUID real da sua empresa
-- ============================================================
-- INSERT INTO payment_methods (company_id, name, category, type, installments, installment_fee, anticipation_discount, active)
-- VALUES
--   ('SEU_COMPANY_ID', 'Dinheiro',                    'dinheiro',              'avista', 1,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'PIX',                          'pix',                   'avista', 1,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'Transferência Bancária',       'transferencia',         'avista', 1,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'Cartão de Débito',             'cartao_debito',         'avista', 1,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'Cartão de Crédito à Vista',   'cartao_credito_avista', 'avista', 1,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'Cartão Crédito 2x',           'cartao_credito_prazo',  'aprazo', 2,  1.99, 1.5,  true),
--   ('SEU_COMPANY_ID', 'Cartão Crédito 3x',           'cartao_credito_prazo',  'aprazo', 3,  1.99, 1.5,  true),
--   ('SEU_COMPANY_ID', 'Cartão Crédito 6x',           'cartao_credito_prazo',  'aprazo', 6,  1.99, 1.5,  true),
--   ('SEU_COMPANY_ID', 'Cartão Crédito 10x',          'cartao_credito_prazo',  'aprazo', 10, 1.99, 1.5,  true),
--   ('SEU_COMPANY_ID', 'Boleto à Vista',               'boleto',                'avista', 1,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'Boleto 30/60/90',              'boleto',                'aprazo', 3,  0,    0,    true),
--   ('SEU_COMPANY_ID', 'Cheque',                       'cheque',                'avista', 1,  0,    0,    true);
