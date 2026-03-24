-- ============================================================
-- Ordens de Serviço de Produção — KeepGoing ERP
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Tabela principal de Ordens de Serviço
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  os_number integer NOT NULL,
  sale_id uuid NOT NULL,
  sale_order_number integer,
  client_name text,
  client_id uuid,
  environments text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Aguardando',
  notes text,
  -- Snapshot de metragens para BI
  materials_m2 jsonb NOT NULL DEFAULT '[]',      -- [{materialName, materialId, totalM2}]
  finishings_linear jsonb NOT NULL DEFAULT '[]', -- [{itemName, materialName, totalLinear, totalQty}]
  total_m2 numeric(10,4) NOT NULL DEFAULT 0,
  total_linear numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, os_number)
);

-- Log de reemissões (ambiente reutilizado em nova O.S.)
CREATE TABLE IF NOT EXISTS work_order_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  sale_id uuid,
  environment text NOT NULL,
  action text NOT NULL DEFAULT 'created', -- 'created' | 'reissued'
  reason text,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_work_orders" ON work_orders;
CREATE POLICY "tenant_work_orders" ON work_orders
  FOR ALL USING (
    company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "tenant_work_order_logs" ON work_order_logs;
CREATE POLICY "tenant_work_order_logs" ON work_order_logs
  FOR ALL USING (
    company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_work_orders_company  ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_sale     ON work_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status   ON work_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_order_logs_wo   ON work_order_logs(work_order_id);
