import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Dedicated callback voor wachtwoordherstel via e-mail.
// Gebruikt geen `next`-parameter zodat de redirect_to URL geen query params bevat
// en altijd overeenkomt met de Supabase toegestane redirect-lijst.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorCode = searchParams.get('error_code')

  if (errorCode === 'otp_expired' || searchParams.get('error') === 'access_denied') {
    return NextResponse.redirect(`${origin}/wachtwoord-vergeten?error=link_verlopen`)
  }

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/wachtwoord-resetten`)
    }
  }

  return NextResponse.redirect(`${origin}/wachtwoord-vergeten?error=link_verlopen`)
}
