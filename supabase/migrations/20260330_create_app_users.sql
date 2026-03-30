-- MIGRATION: app_users — Persistência dos usuários do aplicativo no Supabase
-- Substitui o armazenamento local (localStorage) para dados de usuários do sistema

CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    code INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'ativo',
    profile_id TEXT,
    company_id UUID NOT NULL,
    created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_app_users_company ON app_users(company_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_users_tenant_select" ON app_users
    FOR SELECT
    USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

CREATE POLICY "app_users_tenant_insert" ON app_users
    FOR INSERT
    WITH CHECK (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

CREATE POLICY "app_users_tenant_update" ON app_users
    FOR UPDATE
    USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

CREATE POLICY "app_users_tenant_delete" ON app_users
    FOR DELETE
    USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);
