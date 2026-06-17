import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { token_hash, type, password } = await request.json()

  if (!token_hash || !type || !password) {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 })
  }

  // --- TIJDELIJKE DEBUG-INSTRUMENTATIE (verwijderen na diagnose) ---
  // Een directe POST /auth/v1/verify met dit token + de anon-key gaf HTTP 200.
  // Tóch faalt dezelfde call vanuit deze route. Deze logging legt vast met
  // WELKE config de route op runtime praat en wat verifyOtp exact teruggeeft.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let urlHost: string
  try {
    urlHost = new URL(supabaseUrl ?? '').host || 'EMPTY'
  } catch {
    urlHost = `INVALID(${String(supabaseUrl)})`
  }
  const debug = {
    urlHost,
    urlDefined: typeof supabaseUrl === 'string' && supabaseUrl.length > 0,
    anonKeyPrefix: anonKey ? `${anonKey.slice(0, 6)}…(len ${anonKey.length})` : 'EMPTY',
    tokenHashLen: String(token_hash).length,
    type,
  }
  console.log('[reset-password] runtime config:', JSON.stringify(debug))
  // ----------------------------------------------------------------

  // Gebruik vanilla createClient met flowType: 'implicit' zodat verifyOtp
  // de token hash direct verifieert zonder PKCE flow_state lookup.
  const supabase = createClient(supabaseUrl!, anonKey!, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false },
  })

  type VerifyResult = Awaited<ReturnType<typeof supabase.auth.verifyOtp>>
  let result: VerifyResult
  try {
    result = await supabase.auth.verifyOtp({ token_hash, type })
  } catch (thrown) {
    // verifyOtp gooide i.p.v. een nette { error } terug te geven — typisch een
    // fetch-failure (verkeerde/lege URL) die GoTrue nooit bereikt.
    const e = thrown as Error
    console.error('[reset-password] verifyOtp THREW:', e?.name, '-', e?.message)
    return NextResponse.json(
      {
        error: 'Email link is invalid or has expired',
        debug: { ...debug, thrown: { name: e?.name, message: e?.message } },
      },
      { status: 400 },
    )
  }

  const { data: verifyData, error: verifyError } = result

  if (verifyError || !verifyData.user) {
    const e = verifyError as
      | { name?: string; message?: string; status?: number; code?: string }
      | null
    console.error(
      '[reset-password] verifyOtp error:',
      JSON.stringify({ name: e?.name, message: e?.message, status: e?.status, code: e?.code }),
    )
    return NextResponse.json(
      {
        error: 'Email link is invalid or has expired',
        debug: {
          ...debug,
          verifyError: e ? { name: e.name, message: e.message, status: e.status, code: e.code } : null,
          hadUser: Boolean(verifyData.user),
        },
      },
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
