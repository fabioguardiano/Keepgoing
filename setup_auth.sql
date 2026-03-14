-- SCRIPT DE CONFIGURAÇÃO DE AUTENTICAÇÃO E PERFIS
-- 1. Criar a tabela de perfis (profiles) que estende o auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'seller' CHECK (role IN ('admin', 'seller', 'driver', 'manager')),
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso
-- Qualquer usuário autenticado pode ver perfis (necessário para o sistema funcionar)
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT 
USING (true);

-- Usuários só podem atualizar seu próprio perfil
CREATE POLICY "Users can update their own profiles." 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Função e Trigger para criar perfil automaticamente no SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (new.id, new.raw_user_meta_data->>'name', COALESCE(new.raw_user_meta_data->>'role', 'seller'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Função para migrar o usuário admin inicial (opcional, se você já criou um usuário)
-- NOTA: Você precisará cadastrar o usuário via painel do Supabase primeiro.
