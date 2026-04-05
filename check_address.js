
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envFile = '.env.local'
let supabaseUrl = ''
let supabaseAnonKey = ''

if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n')
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].replace(/['"]/g, '').trim()
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseAnonKey = line.split('=')[1].replace(/['"]/g, '').trim()
        }
    }
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    const { data: companies, error } = await supabase.from('companies').select('name, address')
    if (error) {
        console.error(error)
    } else {
        companies.forEach(c => {
            console.log(`- COMPANY: ${c.name}`);
            console.log(`- ADDRESS: ${c.address}`);
        });
    }
}

run()
