import { supabase } from './lib/supabase.ts';

async function test() {
  console.log("Fetching company_info...");
  const { data, error } = await supabase.from('company_info').select('*').single();
  if (error) {
    console.error("Fetch Error:", error);
  } else {
    console.log("Fetch Data:", data);
  }
}

test();
