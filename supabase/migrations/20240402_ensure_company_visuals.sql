-- =============================================================================
-- GARANTE que a tabela 'companies' contém as colunas para personalização visual.
-- =============================================================================

DO $$
BEGIN
    -- Coluna para cor principal (botões e destaques)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'button_color') THEN
        ALTER TABLE companies ADD COLUMN button_color TEXT;
    END IF;

    -- Coluna para cor de fundo da sidebar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sidebar_color') THEN
        ALTER TABLE companies ADD COLUMN sidebar_color TEXT;
    END IF;

    -- Coluna para cor do texto/ícones da sidebar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sidebar_text_color') THEN
        ALTER TABLE companies ADD COLUMN sidebar_text_color TEXT;
    END IF;

    -- Coluna para logotipo de impressão
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'print_logo_url') THEN
        ALTER TABLE companies ADD COLUMN print_logo_url TEXT;
    END IF;

    -- Coluna para ícone do navegador (favicon)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'icon_url') THEN
        ALTER TABLE companies ADD COLUMN icon_url TEXT;
    END IF;
END $$;
