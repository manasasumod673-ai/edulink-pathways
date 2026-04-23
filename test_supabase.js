import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=')
  return [k, v.join('=').replace(/"/g, '').trim()]
}))

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY)

async function test() {
  const { data, error } = await supabase.from('posts').select('*, profiles(display_name)')
  console.log('Error:', JSON.stringify(error, null, 2))
  console.log('Posts:', JSON.stringify(data, null, 2))
}
test()
