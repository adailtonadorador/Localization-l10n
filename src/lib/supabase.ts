import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Untyped client for operations that need to bypass RLS type inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey) as any
