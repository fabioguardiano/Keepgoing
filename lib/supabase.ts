import { createClient } from '@supabase/supabase-js';
import { Database } from '../types_supabase'; // Vamos gerar isso depois ou usar tipos genéricos

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis do Supabase não configuradas no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
