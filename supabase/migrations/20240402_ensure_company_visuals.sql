-- =============================================================================
-- GARANTE colunas visuais e políticas RLS na tabela 'companies'.
-- =============================================================================

DO $$
BEGIN
    -- 1. ADIÇÃO DE COLUNAS (se não existirem)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'button_color') THEN
        ALTER TABLE companies ADD COLUMN button_color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sidebar_color') THEN
        ALTER TABLE companies ADD COLUMN sidebar_color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sidebar_text_color') THEN
        ALTER TABLE companies ADD COLUMN sidebar_text_color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'print_logo_url') THEN
        ALTER TABLE companies ADD COLUMN print_logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'icon_url') THEN
        ALTER TABLE companies ADD COLUMN icon_url TEXT;
    END IF;
END $$;

-- 2. POLÍTICAS DE SEGURANÇA (RLS)
-- Garante que cada empresa só possa ver e editar seus próprios dados básicos.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_tenant_isolation" ON companies;
CREATE POLICY "companies_tenant_isolation" ON companies
  FOR ALL TO authenticated
  USING  (id = public.my_company_id())
  WITH CHECK (id = public.my_company_id());
