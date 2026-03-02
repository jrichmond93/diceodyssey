import { createClient } from '@supabase/supabase-js'
import { getServerEnv } from './env.js'

export const getSupabaseAdminClient = () => {
  const env = getServerEnv()

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
