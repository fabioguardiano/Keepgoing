-- 20260330_add_sales_realtime.sql
-- Habilita o envio de eventos de Realtime para a tabela de 'sales' (Vendas/Negócios)

DO $$ 
BEGIN 
  -- Adiciona a tabela à publicação do supabase_realtime se ela ainda não estiver lá
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sales;
  END IF;
END $$;
