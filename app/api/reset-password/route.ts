import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { token_hash, type, password } = await request.json()

  if (!token_hash || !type || !password) {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 })
  }

  // Gebruik vanilla createClient met flowType: 'implicit' zodat verifyOtp
  // de token hash direct verifieert zonder PKCE flow_state lookup.
  // createServerClient van @supabase/ssr forceert PKCE-mode wat verifyOtp
  // doet mislukken met implicit-flow tokens uit de e-mailtemplate.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false } },
  )

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  })

  if (verifyError || !verifyData.user) {
    console.error('[reset-password] verifyOtp error:', verifyError)
    return NextResponse.json(
      { error: 'Email link is invalid or has expired' },
      { status: 400 },
    )
  }

  const userId = verifyData.user.id

  // Wachtwoord bijwerken via admin client.
  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })

  if (updateError) {
    console.error('[reset-password] updateUserById error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
