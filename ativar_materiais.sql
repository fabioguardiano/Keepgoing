-- SCRIPT DE ATIVAÇÃO EM MASSA DE MATERIAIS
-- Execute este comando no SQL Editor do seu Supabase para tornar visíveis os materiais que subiram com status "inativo"

UPDATE materials 
SET status = 'ativo' 
WHERE status = 'inativo';

-- Verificação opcional: ver quantos materiais estão ativos agora
-- SELECT count(*) FROM materials WHERE status = 'ativo';
