-- Comissão de Arquiteto
-- 1. Coluna de % de comissão e valor calculado na tabela de vendas
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS architect_commission_pct   NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS architect_commission_value NUMERIC(12,2) DEFAULT NULL;

-- 2. Limite máximo de comissão configurável por empresa
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS max_architect_commission_pct NUMERIC(5,2) DEFAULT NULL;
