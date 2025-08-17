import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'biuld-chat'

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
