
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

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    const { data: companies, error } = await supabase.from('companies').select('*')
    if (error) {
        console.error(error)
    } else {
        console.log('COMPANIES_DATA_START')
        console.log(JSON.stringify(companies, null, 2))
        console.log('COMPANIES_DATA_END')
    }
}

run()
