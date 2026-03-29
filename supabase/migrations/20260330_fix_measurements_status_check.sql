-- FIX: Adiciona 'Excluída' ao check constraint de status da tabela measurements
-- Execute no SQL Editor do Supabase

ALTER TABLE measurements DROP CONSTRAINT IF EXISTS measurements_status_check;

ALTER TABLE measurements
  ADD CONSTRAINT measurements_status_check
  CHECK (status IN ('Pendente', 'Concluída', 'Cancelada', 'Excluída'));
