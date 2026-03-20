import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMaterials() {
  const { count, error } = await supabase
    .from('materials')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching materials count:', error);
  } else {
    console.log(`Total materials in DB: ${count}`);
  }

  const { data: samples, error: sampleError } = await supabase
    .from('materials')
    .select('code, name, category, type, status, stock_quantity')
    .limit(5);

  if (sampleError) {
    console.error('Error fetching samples:', sampleError);
  } else {
    console.log('Sample Materials:', JSON.stringify(samples, null, 2));
  }
}

checkMaterials();
