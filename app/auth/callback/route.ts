import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Wisselt de auth-code (e-mailbevestiging / wachtwoordherstel / OAuth) in voor
// een sessiecookie en stuurt door naar `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorCode = searchParams.get('error_code')
  const rawNext = searchParams.get('next') ?? '/bruiloft'
  // Prevent open-redirect: only accept paths that start with a single '/'.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/bruiloft'

  // Supabase stuurt foutparameters mee als de link verlopen of ongeldig is.
  if (errorCode === 'otp_expired' || searchParams.get('error') === 'access_denied') {
    // Als de link voor wachtwoordherstel was, stuur door naar de vergeten-pagina.
    if (next === '/wachtwoord-resetten') {
      return NextResponse.redirect(`${origin}/wachtwoord-vergeten?error=link_verlopen`)
    }
    return NextResponse.redirect(`${origin}/inloggen?error=link_verlopen`)
  }

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/inloggen?error=auth`)
}
