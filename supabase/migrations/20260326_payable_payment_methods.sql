-- Migration: tabela de formas de pagamento do contas a pagar
-- Separada das formas de pagamento do contas a receber (payment_methods)
-- pois os conceitos são diferentes (sem parcelamento, taxa, etc.)

CREATE TABLE IF NOT EXISTS payable_payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payable_payment_methods_company
  ON payable_payment_methods(company_id);

ALTER TABLE payable_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON payable_payment_methods
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Dados padrão inseridos via aplicação na primeira empresa
