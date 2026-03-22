-- MIGRATION: FIX PERSISTENCE AND MULTI-TENANCY MISMATCHES
-- Execute this in Supabase SQL Editor

-- 1. Ensure 'name' exists in 'clients' as it is used for general display and required by some hooks
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='name') THEN
        ALTER TABLE clients ADD COLUMN name TEXT;
        -- Populate 'name' from existing legal_name or trading_name if possible
        UPDATE clients SET name = COALESCE(trading_name, legal_name, 'Sem Nome') WHERE name IS NULL;
        ALTER TABLE clients ALTER COLUMN name SET NOT NULL;
    END IF;
END $$;

-- 2. Ensure 'company_id' exists in all core tables as a UUID
DO $$ 
DECLARE
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('clients', 'materials', 'products', 'sales', 'orders_service', 'suppliers', 'architects', 'deliveries', 'activity_logs')
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS company_id UUID', t);
    END LOOP;
END $$;

-- 3. Ensure RLS is active and allows ANONYMOUS access for the demo/dev project if no Auth is used
-- Note: This is a TEMPORARY fix for persistence without Supabase Auth. 
-- In production, the "using (true)" should be replaced by "using (company_id = auth.jwt()->>...)"
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON clients;
CREATE POLICY "Public Access" ON clients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON materials;
CREATE POLICY "Public Access" ON materials FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON products;
CREATE POLICY "Public Access" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON sales;
CREATE POLICY "Public Access" ON sales FOR ALL USING (true) WITH CHECK (true);

-- Repeat for others if necessary
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON activity_logs;
CREATE POLICY "Public Access" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
