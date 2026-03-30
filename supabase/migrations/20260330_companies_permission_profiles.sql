-- Adiciona coluna permission_profiles na tabela companies
-- para sincronizar perfis de permissão entre todos os browsers/dispositivos

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS permission_profiles jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.companies.permission_profiles IS
  'Perfis de permissão customizados da empresa. Array de PermissionProfile serializado em JSON.';
