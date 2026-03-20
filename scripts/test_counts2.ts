import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
const env = {};
for (const line of lines) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    let value = values.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key.trim()] = value;
  }
}

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCounts() {
  const { data, error } = await supabase.from('materials').select('*').order('name');
  if (error) {
     console.error(`Error fetching materials:`, error);
  } else {
     console.log(`materials fetched successfully, rows:`, data.length);
  }
}

testCounts();
