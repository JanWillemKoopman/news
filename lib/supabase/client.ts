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

// Untyped variant for tables added after the last type generation (e.g. registry tables).
export function createRawClient(): ReturnType<typeof createBrowserClient<any>> {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
