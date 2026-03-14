-- SCRIPT DE RECUPERAÇÃO E ADMIN MASTER
-- 1. Adicionar coluna is_master à tabela de perfis
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'is_master') THEN
    ALTER TABLE public.profiles ADD COLUMN is_master BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'created_at') THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

-- 2. Garantir que todos os usuários do auth.users tenham um perfil (Correção de Login)
INSERT INTO public.profiles (id, name, role, created_at, is_master)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', email, 'Usuario'), 
    'admin', -- Por segurança, se for recuperação manual, colocamos admin ou vendedor
    created_at,
    CASE WHEN email = 'fabio@tokdeart.com.br' THEN TRUE ELSE FALSE END -- Marcar Fabio como Master
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE 
SET is_master = EXCLUDED.is_master;

-- 3. Atualizar a proteção para focar apenas no is_master
CREATE OR REPLACE FUNCTION public.check_admin_protection()
RETURNS trigger AS $$
BEGIN
  -- Agora bloqueia apenas se is_master for verdadeiro
  IF OLD.is_master = TRUE THEN
    RAISE EXCEPTION 'Não é permitido excluir o Administrador Master do sistema por segurança.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Atualizar o trigger handle_new_user para o novo fluxo
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  invite_record RECORD;
  is_first_user BOOLEAN;
BEGIN
  -- Verificar se é o primeiro usuário do sistema
  SELECT (COUNT(*) = 0) INTO is_first_user FROM public.profiles;

  -- Verificar se o e-mail está na lista de convites
  SELECT * FROM public.user_invites INTO invite_record WHERE email = new.email;
  
  IF is_first_user THEN
    -- O primeiro usuário vira o Master Admin automaticamente
    INSERT INTO public.profiles (id, name, role, is_master)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Administrador Master'), 'admin', TRUE);
  ELSIF invite_record IS NOT NULL THEN
    -- Se estiver convidado, usa os dados do convite
    INSERT INTO public.profiles (id, name, role, is_master)
    VALUES (new.id, invite_record.name, invite_record.role, FALSE);
    
    -- Opcional: deletar convite
    -- DELETE FROM public.user_invites WHERE email = new.email;
  ELSE
    -- Bloquear se não for o primeiro nem estiver convidado
    RAISE EXCEPTION 'Acesso negado. O e-mail % não foi pré-cadastrado por um administrador.', new.email;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
