import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { token_hash, type, password } = await request.json()

  if (!token_hash || !type || !password) {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 })
  }

  const supabase = createClient()

  // Verifieer het token en haal de user op.
  // Met PKCE tokens is de sessie na verifyOtp niet bruikbaar voor updateUser,
  // maar de user ID is wel beschikbaar voor admin.updateUserById.
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  })

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 })
  }

  const userId = verifyData?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Gebruiker niet gevonden.' }, { status: 400 })
  }

  // Admin client om het wachtwoord bij te werken, onafhankelijk van sessie.
  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
