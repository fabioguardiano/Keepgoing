-- =============================================================================
-- Garante que existe uma linha na tabela companies para o UUID padrão.
-- Isso evita o erro 400 quando o usuário ainda está vinculado ao UUID zero.
-- =============================================================================
INSERT INTO public.companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Empresa Padrão')
ON CONFLICT (id) DO NOTHING;
