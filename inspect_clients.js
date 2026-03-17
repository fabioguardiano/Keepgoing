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

async function inspectClients() {
  console.log('--- Inspeção de Clientes ---');
  
  // 1. Amostra de clientes
  const { data: sample, error: sampleError } = await supabase.from('clients').select('*').limit(3);
  if (sampleError) {
    console.error('Erro ao buscar amostra de clientes:', sampleError.message);
  } else {
    console.log('Amostra de Clientes (primeiros 3):');
    console.log(JSON.stringify(sample, null, 2));
  }

  // 2. Tentar buscar por um nome específico (se houver algum conhecido ou comum)
  // ...
  
  // 3. Verificar se há algum filtro padrão oculto ou se o RLS está bloqueando SELECT silenciosamente
  // (O count: exact já indicou que existem registros, mas o SELECT * pode ser diferente?)
  const { data: allData, error: allErr, count } = await supabase.from('clients').select('*', { count: 'exact' });
  if (allErr) {
    console.error('Erro no SELECT *:', allErr.message);
  } else {
    console.log(`Total de registros retornados no SELECT *: ${allData.length}`);
    console.log(`Total de registros via count: ${count}`);
  }

  console.log('--- Fim da Inspeção ---');
}

inspectClients();
