-- Suporte a múltiplos desenhos e prazo de entrega
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS drawing_urls jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delivery_deadline text;
