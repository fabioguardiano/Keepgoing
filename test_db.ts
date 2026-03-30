import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
    const res = await supabase.from('companies').select('permission_profiles').eq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Read:", res.data);
})();
