import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
const env = {};
for (const line of lines) {
  if (line.trim() && !line.startsWith('#')) {
    const parts = line.split('=');
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAllCounts() {
  const tables = ['clients', 'materials', 'brands', 'product_groups', 'company_info', 'orders_service', 'profiles'];
  console.log('--- Verificando contagem de tabelas ---');
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`Tabela ${table}: Erro - ${error.message}`);
      } else {
        console.log(`Tabela ${table}: ${count} registros`);
      }
    } catch (e) {
      console.error(`Tabela ${table}: Falha catastrófica - ${e.message}`);
    }
  }
  console.log('--- Fim da verificação ---');
}

testAllCounts();
