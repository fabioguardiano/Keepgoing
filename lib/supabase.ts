import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis do Supabase não configuradas no .env');
}

// sessionStorage: sessão expira ao fechar o navegador/aba (segurança)
// Fallback para memória se sessionStorage não estiver disponível (Safari privado, etc.)
const getSessionStorage = (): Storage | undefined => {
  try {
    const test = '__kg_test__';
    window.sessionStorage.setItem(test, '1');
    window.sessionStorage.removeItem(test);
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getSessionStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
