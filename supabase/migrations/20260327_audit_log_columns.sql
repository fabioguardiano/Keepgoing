-- Adiciona colunas de auditoria na tabela activity_logs
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS module text DEFAULT NULL;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entity_type text DEFAULT NULL;
