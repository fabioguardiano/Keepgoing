
-- MIGRATION: ADICIONA RASTREAMENTO DE MOTORISTAS E MELHORIAS NAS ENTREGAS

-- 1. Tabela para armazenar a localização em tempo real dos motoristas
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    driver_id UUID, -- Pode ser nulo se usarmos apenas o nome por enquanto
    driver_name TEXT NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(company_id, driver_name)
);

-- 2. Adiciona suporte a grupos de rota na tabela de entregas (se não houver)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'route_group') THEN
        ALTER TABLE deliveries ADD COLUMN route_group TEXT;
    END IF;
END $$;

-- 3. Habilita RLS para a nova tabela
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- 4. Política de acesso público (seguindo o padrão do projeto para desenvolvimento)
DROP POLICY IF EXISTS "Public Access" ON driver_locations;
CREATE POLICY "Public Access" ON driver_locations FOR ALL USING (true) WITH CHECK (true);
