-- SCRIPT DE MIGRAÇÃO: SALVAR TUDO NO SUPABASE
-- Execute este script no SQL Editor do seu projeto no Supabase

-- 1. TABELAS DE GRUPOS (Produtos e Serviços)
CREATE TABLE IF NOT EXISTS product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS service_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. CANAIS DE VENDAS
CREATE TABLE IF NOT EXISTS sales_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. FASES DE VENDAS E PRODUÇÃO
CREATE TABLE IF NOT EXISTS sales_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS production_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. FINANCEIRO (Transações)
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL, -- 'revenue' ou 'expense'
    category TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'pending' ou 'completed'
    payment_method TEXT,
    notes TEXT,
    reference_id TEXT, -- Para ligar a OS ou Venda
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. SEGURANÇA BÁSICA (RLS - Row Level Security)
-- Permitir acesso público/anônimo a todas as tabelas acima para simplificar a aplicação.
-- OBS: Adapte de acordo com a regra de login se precisar restringir acessos futuros.

ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Product Groups" ON product_groups;
CREATE POLICY "Public Access Product Groups" ON product_groups FOR ALL USING (true);

ALTER TABLE service_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Service Groups" ON service_groups;
CREATE POLICY "Public Access Service Groups" ON service_groups FOR ALL USING (true);

ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Sales Channels" ON sales_channels;
CREATE POLICY "Public Access Sales Channels" ON sales_channels FOR ALL USING (true);

ALTER TABLE sales_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Sales Phases" ON sales_phases;
CREATE POLICY "Public Access Sales Phases" ON sales_phases FOR ALL USING (true);

ALTER TABLE production_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Production Phases" ON production_phases;
CREATE POLICY "Public Access Production Phases" ON production_phases FOR ALL USING (true);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Finance" ON finance_transactions;
CREATE POLICY "Public Access Finance" ON finance_transactions FOR ALL USING (true);

-- Garante que brands também tenha política livre (já existia no diagrama antigo)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Brands" ON brands;
CREATE POLICY "Public Access Brands" ON brands FOR ALL USING (true);

-- Garante que staff tenha política livre
ALTER TABLE production_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Staff" ON production_staff;
CREATE POLICY "Public Access Staff" ON production_staff FOR ALL USING (true);
