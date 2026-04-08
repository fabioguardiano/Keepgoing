-- ─────────────────────────────────────────────────────────────────────────────
-- Plano de Contas — Grupos e Contas Analíticas
-- Módulo: Contas a Pagar / Financeiro
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Grupos do Plano de Contas (categorias pai)
CREATE TABLE IF NOT EXISTS account_groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code         INTEGER     NOT NULL,                        -- 1, 2, 3, 4, 5
  name         TEXT        NOT NULL,
  is_admin     BOOLEAN     NOT NULL DEFAULT FALSE,          -- D.A. (Despesa Administrativa)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

-- 2. Plano de Contas Detalhado (contas analíticas filhas)
CREATE TABLE IF NOT EXISTS account_plan (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code                   INTEGER     NOT NULL,              -- ex: 5020
  group_id               UUID        NOT NULL REFERENCES account_groups(id) ON DELETE RESTRICT,
  name                   TEXT        NOT NULL,
  cost_type              TEXT        NOT NULL CHECK (cost_type IN ('Fixo', 'Variável')),
  default_payment_method TEXT,                              -- Boleto, PIX, Cartão...
  is_operational         BOOLEAN     NOT NULL DEFAULT TRUE, -- C.OP.
  active                 BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

-- 3. Adicionar referência em accounts_payable
ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS account_plan_id UUID REFERENCES account_plan(id);

-- 4. RLS
ALTER TABLE account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_plan   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_groups_company_isolation" ON account_groups;
CREATE POLICY "account_groups_company_isolation" ON account_groups
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "account_plan_company_isolation" ON account_plan;
CREATE POLICY "account_plan_company_isolation" ON account_plan
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- DADOS INICIAIS
-- Substitua '00000000-0000-0000-0000-000000000000' pelo UUID real da empresa
-- ou rode via aplicação na função "Importar Padrão"
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Exemplo de seed manual (execute separadamente por empresa):
--
-- INSERT INTO account_groups (company_id, code, name, is_admin) VALUES
--   ('<company_id>', 1, 'DEDUÇÕES',                          FALSE),
--   ('<company_id>', 2, 'CUSTOS DOS PRODUTOS / SERVIÇOS VENDIDOS', FALSE),
--   ('<company_id>', 3, 'DESPESAS DE VENDAS',                FALSE),
--   ('<company_id>', 4, 'DESPESAS ADMINISTRATIVAS',          TRUE),
--   ('<company_id>', 5, 'DESPESAS FINANCEIRAS',              FALSE);
--
-- INSERT INTO account_plan (company_id, code, group_id, name, cost_type, is_operational) VALUES
--   ('<company_id>', 2010, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=2), 'Matéria-prima',          'Variável', TRUE),
--   ('<company_id>', 2020, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=2), 'Insumos de Produção',    'Variável', TRUE),
--   ('<company_id>', 4010, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=4), 'Aluguel',               'Fixo',     TRUE),
--   ('<company_id>', 4020, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=4), 'Material de Limpeza',   'Fixo',     TRUE),
--   ('<company_id>', 3010, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=3), 'Combustível p/ Entregas','Variável',TRUE),
--   ('<company_id>', 3020, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=3), 'Combustível p/ Medição', 'Variável',TRUE),
--   ('<company_id>', 2030, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=2), '13º Salário e Férias',  'Fixo',     TRUE),
--   ('<company_id>', 2040, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=2), 'Água e Esgoto',         'Fixo',     TRUE),
--   ('<company_id>', 3030, (SELECT id FROM account_groups WHERE company_id='<company_id>' AND code=3), 'Comissões',             'Variável', TRUE);
