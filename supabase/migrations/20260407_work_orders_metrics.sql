-- =============================================================================
-- Adiciona colunas de métricas e campos modernos à tabela work_orders.
-- Seguro para executar múltiplas vezes (ADD COLUMN IF NOT EXISTS).
-- =============================================================================

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS os_sub_number      INTEGER        DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sale_order_number  INTEGER,
  ADD COLUMN IF NOT EXISTS client_id          UUID,
  ADD COLUMN IF NOT EXISTS seller_name        TEXT,
  ADD COLUMN IF NOT EXISTS environments       JSONB          DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sale_item_ids      JSONB          DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delivery_deadline  TEXT,
  ADD COLUMN IF NOT EXISTS materials_m2       JSONB          DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS finishings_linear  JSONB          DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS total_m2           NUMERIC(14,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_linear       NUMERIC(14,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resale_products    JSONB          DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS production_phase   TEXT,
  ADD COLUMN IF NOT EXISTS drawing_url        TEXT,
  ADD COLUMN IF NOT EXISTS drawing_urls       JSONB          DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS priority           TEXT           DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS assigned_users     JSONB          DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_work_orders_os_number ON work_orders(os_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_production_phase ON work_orders(production_phase);
