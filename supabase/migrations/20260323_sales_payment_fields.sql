-- Adiciona campos de forma de pagamento estruturada na tabela sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_method_id   UUID,
  ADD COLUMN IF NOT EXISTS payment_method_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_installments INTEGER,
  ADD COLUMN IF NOT EXISTS first_due_date       DATE;
