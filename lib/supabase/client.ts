import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './database.types'

// Supabase-client voor de browser (Client Components). Gebruikt de publieke
// anon-key; RLS bepaalt wat deze gebruiker mag zien/doen.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
