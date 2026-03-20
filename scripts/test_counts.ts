import { supabase } from './lib/supabase.js';

async function testCounts() {
  const tables = ['clients', 'materials', 'brands', 'product_groups', 'company_info'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
       console.error(`Error fetching ${table}:`, error.message);
    } else {
       console.log(`Table ${table}: ${count} rows`);
    }
  }
}

testCounts();
