-- Migration: garante a coluna legacy_migration_done na tabela companies
-- Usada pelo hook useLegacyMigration para controlar migração única de dados
-- do localStorage para o Supabase.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS legacy_migration_done BOOLEAN NOT NULL DEFAULT FALSE;
