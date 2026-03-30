import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
    // try signing in to test if RLS stops update
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'fabio@marmoflow.com',
        password: 'admin' // you can also create auth token using admin api if needed but we don't know the password
    });
    console.log(authError ? 'Auth failed' : 'Auth success');
})();
