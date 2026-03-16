-- Tabela para armazenar as configurações visuais e dados da empresa
CREATE TABLE IF NOT EXISTS public.company_info (
    id integer PRIMARY KEY DEFAULT 1,
    name text,
    document text,
    address text,
    phone text,
    email text,
    logo_url text, -- Permite strings base64 longas
    sidebar_color text,
    sidebar_text_color text,
    button_color text,
    lost_reason_options text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS (Segurança a nível de linha)
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
-- Permitir leitura para todos (autenticados ou não, pois configuram o tema base)
CREATE POLICY "Permitir leitura de company_info" ON public.company_info
    FOR SELECT USING (true);

-- Permitir atualização para administradores/gerentes ou todos usando a aplicação autenticada
CREATE POLICY "Permitir atualização de company_info" ON public.company_info
    FOR ALL USING (true);

-- Inserir registro padrão se a tabela estiver vazia
INSERT INTO public.company_info (id, name, document, address, phone, email, sidebar_color, sidebar_text_color, button_color)
SELECT 1, 'Tok de Art', '14.092.404/0001-67', 'Rua Américo Brasiliense, 1853 - Vila Seixas - Ribeirão Preto - SP', '(16) 3636-0114', 'vendas@tokdeart.com.br', '#0f172a', '#cbd5e1', '#ec5b13'
WHERE NOT EXISTS (SELECT 1 FROM public.company_info WHERE id = 1);
