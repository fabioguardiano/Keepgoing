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

const sessionStorage = getSessionStorage();

// Avisa o usuário em modo privado/incógnito onde sessionStorage não persiste
if (!sessionStorage && typeof window !== 'undefined') {
  // Espera o DOM estar pronto antes de mostrar o aviso
  const showWarning = () => {
    const existing = document.getElementById('__kg_private_warn__');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = '__kg_private_warn__';
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#b45309', 'color:#fff', 'font-size:13px', 'font-weight:700',
      'padding:8px 16px', 'text-align:center', 'letter-spacing:0.01em',
    ].join(';');
    banner.textContent = '⚠️ Modo privado detectado — a sessão não será mantida ao recarregar a página. Use o navegador em modo normal para melhor experiência.';
    document.body.prepend(banner);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showWarning);
  } else {
    showWarning();
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
