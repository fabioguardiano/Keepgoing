
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Read .env.local if it exists
if (fs.existsSync('.env.local')) {
  const fileContent = fs.readFileSync('.env.local', 'utf8')
  const env = {}
  fileContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1')
    }
  })
  process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL
  process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkCompany() {
  const { data, error } = await supabase.from('companies').select('*').limit(1)
  if (error) {
    console.error(error)
    return
  }
  if (data && data.length > 0) {
    console.log('Company Data from DB:')
    console.log(JSON.stringify(data[0], null, 2))
  } else {
    console.log('No company data found.')
  }
}

checkCompany()
