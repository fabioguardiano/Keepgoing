-- Adiciona colunas de grupos/metadados à tabela companies
-- Necessário para sincronizar Grupos de Serviços, Grupos de Produtos e Marcas
-- entre todos os usuários (antes ficava só no localStorage do admin)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS service_groups  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_groups  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brands          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS print_logo_url  text,
  ADD COLUMN IF NOT EXISTS icon_url        text,
  ADD COLUMN IF NOT EXISTS sales_phases    jsonb DEFAULT '[]'::jsonb;
