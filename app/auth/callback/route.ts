import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Wisselt de auth-code (e-mailbevestiging / wachtwoordherstel / OAuth) in voor
// een sessiecookie en stuurt door naar `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/bruiloft'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
