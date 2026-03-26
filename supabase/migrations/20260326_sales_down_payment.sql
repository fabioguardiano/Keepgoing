-- Migration: campos de entrada (down payment) na tabela sales
-- Permite registrar um valor de entrada separado do parcelamento principal

ALTER TABLE sales ADD COLUMN IF NOT EXISTS down_payment_value    numeric(12,2)  DEFAULT NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS down_payment_method_id   uuid           DEFAULT NULL REFERENCES payment_methods(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS down_payment_method_name text           DEFAULT NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS down_payment_due_date    date           DEFAULT NULL;
