-- MIGRATION: measurements table — criar e garantir todas as colunas
-- Execute no SQL Editor do Supabase

-- 1. Cria a tabela se não existir (sem FK no os_id para evitar conflito de tipos)
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL DEFAULT '08:00',
    status TEXT NOT NULL DEFAULT 'Pendente',
    description TEXT,
    measurer_name TEXT,
    os_id TEXT,
    os_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Adiciona colunas que podem estar faltando na tabela já existente
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS os_id TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS os_number TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS measurer_name TEXT;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_measurements_company_id ON measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_measurements_date        ON measurements(date);
CREATE INDEX IF NOT EXISTS idx_measurements_status      ON measurements(status);

-- 4. RLS
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation measurements" ON measurements;
CREATE POLICY "Company isolation measurements" ON measurements
    FOR ALL
    USING  (company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'))
    WITH CHECK (company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'));
