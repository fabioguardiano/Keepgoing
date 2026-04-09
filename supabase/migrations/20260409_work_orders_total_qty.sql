-- Adiciona coluna total_qty em work_orders (itens UND/outros além do ML)
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS total_qty INTEGER;
