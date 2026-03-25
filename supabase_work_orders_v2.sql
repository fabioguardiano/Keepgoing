-- Novas colunas em work_orders (as anteriores já rodaram com sucesso)
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS production_phase text DEFAULT 'Aguardando',
  ADD COLUMN IF NOT EXISTS drawing_url text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS assigned_users jsonb NOT NULL DEFAULT '[]';

-- Novas colunas em work_order_logs (para rastrear de onde → para onde)
ALTER TABLE work_order_logs
  ADD COLUMN IF NOT EXISTS from_phase text,
  ADD COLUMN IF NOT EXISTS to_phase text;

-- Bucket para armazenar os desenhos técnicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-drawings', 'work-order-drawings', true)
ON CONFLICT DO NOTHING;

-- Políticas de storage (sem IF NOT EXISTS — drop antes de criar)
DROP POLICY IF EXISTS "drawings_select" ON storage.objects;
CREATE POLICY "drawings_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'work-order-drawings');

DROP POLICY IF EXISTS "drawings_insert" ON storage.objects;
CREATE POLICY "drawings_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'work-order-drawings');

DROP POLICY IF EXISTS "drawings_delete" ON storage.objects;
CREATE POLICY "drawings_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'work-order-drawings');
