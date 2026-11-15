import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when the public Supabase settings are present (see .env.example). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * The single Supabase client. The anon key is public by design; every request
 * is authorized by Row Level Security in the database (ARCHITECTURE §5).
 */
export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The QR key travels in the URL fragment and is handled by KeyLanding;
      // supabase-js must not try to parse fragments as OAuth redirects.
      detectSessionInUrl: false,
    },
  },
)
