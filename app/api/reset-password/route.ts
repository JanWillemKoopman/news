import { NextResponse } from 'next/server'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

// OTP expiry: standaard 3600 seconden in Supabase. Bij aanpassing in het
// dashboard dit getal meepassen.
const OTP_EXPIRY_SECONDS = 3600

export async function POST(request: Request) {
  const { token_hash, type, password } = await request.json()

  if (!token_hash || !type || !password) {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 })
  }

  // verifyOtp via @supabase/ssr createServerClient werkt niet betrouwbaar
  // met implicit-flow tokens (PKCE-gedrag van de SSR-client interfereert).
  // Directe admin-query op auth.one_time_tokens omzeilt dit probleem.
  const raw = createRawAdminClient()

  const { data: tokenRow, error: tokenError } = await raw
    .schema('auth')
    .from('one_time_tokens')
    .select('id, user_id, created_at')
    .eq('token_hash', token_hash)
    .eq('token_type', 'recovery_token')
    .single()

  if (tokenError || !tokenRow) {
    return NextResponse.json(
      { error: 'Email link is invalid or has expired' },
      { status: 400 },
    )
  }

  // Controleer of het token niet verlopen is.
  const createdAt = new Date(tokenRow.created_at).getTime()
  if (Date.now() - createdAt > OTP_EXPIRY_SECONDS * 1000) {
    return NextResponse.json(
      { error: 'Email link is invalid or has expired' },
      { status: 400 },
    )
  }

  const userId = tokenRow.user_id

  // Verwijder het token zodat het niet opnieuw gebruikt kan worden.
  await raw.schema('auth').from('one_time_tokens').delete().eq('id', tokenRow.id)

  // Wachtwoord bijwerken via admin client.
  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
