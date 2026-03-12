import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testando conexão com:', supabaseUrl);
  const { data, error } = await supabase.from('materials').select('id').limit(1);
  
  if (error) {
    console.error('Erro na conexão:', error.message);
    process.exit(1);
  } else {
    console.log('Conexão estabelecida com sucesso! Tabela "materials" acessível.');
    process.exit(0);
  }
}

testConnection();
