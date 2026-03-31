-- =============================================================================
-- FIX: Garante que todos os usuários estão na tabela profiles
-- e atualiza my_company_id() com COALESCE fallback para o UUID zero.
--
-- CONTEXTO: 20260325_fix_rls_security.sql trocou as políticas RLS para usar
-- public.my_company_id() que lê da tabela profiles. Usuários sem entrada em
-- profiles recebem NULL, o que bloqueava todas as queries.
-- =============================================================================

-- 1. Popula profiles para TODOS os usuários existentes no auth.
--    - Usa company_id do user_metadata quando disponível
--    - Faz fallback para '00000000-0000-0000-0000-000000000000' (empresa padrão)
INSERT INTO public.profiles (id, company_id)
SELECT
  id,
  COALESCE(
    (raw_user_meta_data ->> 'company_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  )
FROM auth.users
ON CONFLICT (id) DO UPDATE
  SET company_id = EXCLUDED.company_id
  WHERE profiles.company_id IS NULL
     OR profiles.company_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 2. Atualiza a função my_company_id() com fallback para UUID zero.
--    Assim, mesmo se um usuário não tiver perfil criado, ele acessa
--    a empresa padrão em vez de receber NULL e ter tudo bloqueado.
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT company_id FROM public.profiles WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
$$;

-- 3. Verifica o resultado (opcional — pode comentar depois)
-- SELECT id, company_id FROM public.profiles;
