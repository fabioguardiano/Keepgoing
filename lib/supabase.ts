import { createClient } from '@supabase/supabase-js';
import { Database } from '../types_supabase'; // Vamos gerar isso depois ou usar tipos genéricos

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis do Supabase não configuradas no .env');
}

// Storage customizado para evitar o uso de navigator.locks que causa AbortError em alguns ambientes
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  }
};

// Lock compatível com Supabase Auth v2 para ignorar navigator.locks com segurança
const safeLock = async <R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  console.log('[AuthAudit] SafeLock: Bypass navigator.locks para', name);
  return await fn();
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'kg-auth-v13-stable',
    lock: safeLock as any
  }
});
