import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

// Service-role client: omzeilt RLS. UITSLUITEND server-side gebruiken voor
// beheer/seed. 'server-only' voorkomt dat dit ooit in de client-bundle belandt.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
