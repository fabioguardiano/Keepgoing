-- Adicionar coluna avatar_url na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL ou Base64 da imagem de perfil do usuário';
