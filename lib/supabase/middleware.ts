import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from './database.types'

// /bruiloft is publiek toegankelijk: bezoekers krijgen de landing + onboarding
// en starten een anonieme gast-sessie via signInAnonymously().
const PROTECTED_PREFIXES = ['/uitnodiging', '/admin']
const AUTH_PAGES = ['/login', '/signup']

// Ververst de sessie bij elke request en beschermt routes. Cruciaal: geef
// ALTIJD het supabaseResponse-object terug zodat ververste auth-cookies
// meegaan naar de browser.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Anonieme gast-sessies blokkeren de login/signup-pagina's niet: een gast
  // moet ook nog naar een volwaardig account kunnen overstappen via /login.
  if (user && !user.is_anonymous && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/bruiloft'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
