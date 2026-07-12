import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { sendWelcomeEmailOnce } from '@/lib/email/welcome'
import { createClient } from '@/lib/supabase/server'

// Alternatief op /auth/callback voor e-mailsjablonen die token_hash gebruiken.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? '/bruiloft'
  // Prevent open-redirect: only accept paths that start with a single '/'.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/bruiloft'

  if (tokenHash && type) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      // Nieuw account via registratie bevestigd: stuur (eenmalig) de
      // welkomst-/bevestigingsmail. Best-effort — nooit de login blokkeren.
      if ((type === 'signup' || type === 'email') && data.user) {
        try {
          await sendWelcomeEmailOnce(data.user.id)
        } catch (err) {
          console.error('[auth/confirm] welkomstmail mislukt:', err)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/inloggen?error=confirm`)
}
