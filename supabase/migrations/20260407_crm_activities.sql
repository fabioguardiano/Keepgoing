-- =============================================================================
-- Tabela de atividades CRM (tarefas futuras vinculadas a vendas e O.S.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_activities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL,
  reference_id  UUID        NOT NULL,                    -- sale.id ou work_order.id
  reference_type TEXT       NOT NULL DEFAULT 'sale',     -- 'sale' | 'work_order'
  title         TEXT        NOT NULL,
  due_date      DATE        NOT NULL,
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'pendente', -- 'pendente' | 'concluida'
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_isolation" ON crm_activities;
CREATE POLICY "company_isolation" ON crm_activities
  FOR ALL TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

CREATE INDEX IF NOT EXISTS idx_crm_activities_company   ON crm_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_reference ON crm_activities(reference_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due_date  ON crm_activities(due_date);
