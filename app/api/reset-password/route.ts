import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { token_hash, type, password } = await request.json()

  if (!token_hash || !type || !password) {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 })
  }

  const supabase = createClient()

  // Server-side verifyOtp heeft geen PKCE code verifier nodig.
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  })

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 })
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
