-- MIGRATION: Extend companies table with full CompanyInfo fields
-- Permite que as configurações de empresa (cores, logo, contato) sejam
-- compartilhadas entre todos os usuários via Supabase.

-- =============================================================================
-- 1. ADICIONAR COLUNAS À TABELA companies
-- =============================================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS logo_url         TEXT,
  ADD COLUMN IF NOT EXISTS sidebar_color    TEXT,
  ADD COLUMN IF NOT EXISTS sidebar_text_color TEXT,
  ADD COLUMN IF NOT EXISTS button_color     TEXT,
  ADD COLUMN IF NOT EXISTS lost_reason_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_note       TEXT,
  ADD COLUMN IF NOT EXISTS max_discount_pct NUMERIC;

-- =============================================================================
-- 2. RLS — LEITURA E ATUALIZAÇÃO DA PRÓPRIA EMPRESA
-- =============================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_select" ON companies;
CREATE POLICY "company_select" ON companies
  FOR SELECT TO authenticated
  USING (
    id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

DROP POLICY IF EXISTS "company_update" ON companies;
CREATE POLICY "company_update" ON companies
  FOR UPDATE TO authenticated
  USING (
    id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  )
  WITH CHECK (
    id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- =============================================================================
-- 3. SEED — VALORES PADRÃO PARA A EMPRESA EXISTENTE
-- =============================================================================
UPDATE companies
SET
  address             = COALESCE(address, 'Rua Américo Brasiliense, 1853 - Vila Seixas - Ribeirão Preto - SP'),
  phone               = COALESCE(phone, '(16) 3636-0114'),
  email               = COALESCE(email, 'vendas@tokdeart.com.br'),
  sidebar_color       = COALESCE(sidebar_color, '#0f172a'),
  sidebar_text_color  = COALESCE(sidebar_text_color, '#cbd5e1'),
  button_color        = COALESCE(button_color, '#ec5b13'),
  lost_reason_options = COALESCE(lost_reason_options, '["Tinha preço menor","Prazo de entrega melhor","Desistiu de fazer","Não aprovaram o material","Distância da obra"]'::jsonb)
WHERE id = '00000000-0000-0000-0000-000000000000';