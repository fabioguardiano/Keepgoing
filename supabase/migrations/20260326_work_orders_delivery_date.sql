-- Migration: adiciona coluna delivery_date à tabela work_orders
-- Armazena a data de entrega calculada no momento da geração da O.S.
-- (data fixa, não recalculada dinamicamente)

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS delivery_date date;
