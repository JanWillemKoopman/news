import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from './database.types'

// Supabase-client voor Server Components, Route Handlers en Server Actions.
// Leest/schrijft de sessie via cookies. Schrijven faalt stil in een puur
// renderende Server Component — de middleware ververst de sessie daar.
export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Aangeroepen vanuit een Server Component; veilig te negeren.
          }
        },
      },
    }
  )
}
