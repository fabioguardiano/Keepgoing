-- Migration: adiciona coluna sale_item_ids à tabela work_orders
-- Essa coluna armazena os IDs das peças individuais do pedido que compõem esta O.S.

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS sale_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
