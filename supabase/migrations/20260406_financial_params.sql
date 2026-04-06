-- ============================================================
-- Parâmetros Financeiros da Empresa — Resumo de Venda
-- ============================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS seller_commission_pct   NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_expenses_pct      NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS technical_reserve_pct   NUMERIC(5,2) DEFAULT NULL;
