-- SCRIPT DE NORMALIZAÇÃO FINAL DO BANCO DE DADOS (Versão Compatível Supabase)
-- Execute este script no SQL Editor do seu projeto no Supabase

-- 1. TABELA DE ORDENS DE SERVIÇO (Se não existir)
CREATE TABLE IF NOT EXISTS orders_service (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number TEXT UNIQUE NOT NULL,
    order_number TEXT,
    client_name TEXT NOT NULL,
    project_description TEXT,
    material TEXT,
    material_area DECIMAL(10,2),
    phase TEXT NOT NULL,
    seller TEXT,
    deadline DATE,
    priority TEXT DEFAULT 'media',
    client_id UUID,
    architect_id UUID,
    architect_name TEXT,
    total_value DECIMAL(12,2),
    remaining_value DECIMAL(12,2),
    observations TEXT,
    internal_observations TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    payments JSONB DEFAULT '[]'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,
    phase_history JSONB DEFAULT '[]'::jsonb,
    responsible_staff_name TEXT,
    sales_channel TEXT,
    sales_phase TEXT,
    is_os_generated BOOLEAN DEFAULT true,
    status TEXT,
    discount_value DECIMAL(12,2),
    discount_percentage DECIMAL(5,2),
    payment_conditions TEXT,
    delivery_deadline TEXT,
    totals JSONB DEFAULT '{}'::jsonb,
    lost_reason TEXT,
    lost_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE ENTREGAS
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    os_number TEXT,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    date DATE,
    time TEXT,
    status TEXT DEFAULT 'agendado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE MEDIÇÕES
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    os_number TEXT,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    date DATE,
    time TEXT,
    status TEXT DEFAULT 'agendado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. COLUNAS DE GEOLOCALIZAÇÃO NO PERFIL (Para rastreamento do medidor)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_update TIMESTAMP WITH TIME ZONE;

-- 6. TABELA DE EQUIPE (Staff)
CREATE TABLE IF NOT EXISTS production_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT,
    hourly_rate DECIMAL(10,2),
    phone TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE MATERIAIS (Materia Prima)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    price DECIMAL(12,2),
    stock DECIMAL(12,2),
    min_stock DECIMAL(12,2),
    status TEXT DEFAULT 'ativo',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. ATIVAR SEGURANÇA (RLS) E POLÍTICAS
-- PostgreSQL no Supabase não suporta "IF NOT EXISTS" em CREATE POLICY na maioria das versões.
-- A técnica correta é Dropar se existir e Criar.

ALTER TABLE orders_service ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access OS" ON orders_service;
CREATE POLICY "Public Access OS" ON orders_service FOR ALL USING (true);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Deliveries" ON deliveries;
CREATE POLICY "Public Access Deliveries" ON deliveries FOR ALL USING (true);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Measurements" ON measurements;
CREATE POLICY "Public Access Measurements" ON measurements FOR ALL USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Notifications" ON notifications;
CREATE POLICY "Public Access Notifications" ON notifications FOR ALL USING (true);

ALTER TABLE production_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Staff" ON production_staff;
CREATE POLICY "Public Access Staff" ON production_staff FOR ALL USING (true);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Materials" ON materials;
CREATE POLICY "Public Access Materials" ON materials FOR ALL USING (true);
