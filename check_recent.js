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

async function checkRecentClients() {
  console.log('--- Clientes Recentes ---');
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.table(data);
  }
  console.log('--- Fim ---');
}

checkRecentClients();
