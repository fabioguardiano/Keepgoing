-- SCRIPT DE REFINAMENTO DE AUTENTICAÇÃO: CONVITES E PROTEÇÃO (VERSÃO CORRIGIDA)

-- 1. Criar tabela de convites (whitelist)
CREATE TABLE IF NOT EXISTS public.user_invites (
  email TEXT PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'seller' CHECK (role IN ('admin', 'seller', 'driver', 'manager')),
  invited_by UUID REFERENCES auth.users(id),
  skip_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS para convites
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Garantir que a coluna skip_email exista
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_invites' AND COLUMN_NAME = 'skip_email') THEN
    ALTER TABLE public.user_invites ADD COLUMN skip_email BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Apenas admins podem gerenciar convites
DROP POLICY IF EXISTS "Admins can manage invites" ON public.user_invites;
CREATE POLICY "Admins can manage invites" 
ON public.user_invites FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 2. Trigger para proteger o Administrador contra exclusão
CREATE OR REPLACE FUNCTION public.check_admin_protection()
RETURNS trigger AS $$
BEGIN
  -- Bloqueia a exclusão de qualquer usuário que tenha o cargo de 'admin'
  -- Isso garante que o login principal e outros admins não sejam apagados por engano
  IF OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Não é permitido excluir usuários com cargo de Administrador por segurança.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Ativar o trigger na tabela profiles
DROP TRIGGER IF EXISTS tr_protect_admin ON public.profiles;
CREATE TRIGGER tr_protect_admin
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_admin_protection();

-- 3. Atualizar a função de novo usuário para validar contra a whitelist
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Verificar se o e-mail está na lista de convites
  SELECT * FROM public.user_invites INTO invite_record WHERE email = new.email;
  
  IF invite_record IS NULL THEN
    -- Se não houver perfis ainda (primeiro uso), permite criar o primeiro admin
    IF (SELECT COUNT(*) FROM public.profiles) > 0 THEN
      -- Se já houver usuários e este e-mail NÃO estiver convidado, bloqueia
      RAISE EXCEPTION 'Acesso negado. O e-mail % não foi pré-cadastrado por um administrador.', new.email;
    END IF;
    
    -- Caso seja o PRIMEIRO login (whitelist vazia), cria como admin
    INSERT INTO public.profiles (id, name, role)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Administrador Principal'), 'admin');
  ELSE
    -- Se estiver convidado, usa os dados do convite (nome e cargo pré-definidos)
    INSERT INTO public.profiles (id, name, role)
    VALUES (new.id, invite_record.name, invite_record.role);
    
    -- Opcionalmente: remover do convite após cadastro concluído
    -- DELETE FROM public.user_invites WHERE email = new.email;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular o trigger de criação
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
