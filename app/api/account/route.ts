import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function DELETE() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Niet ingelogd.' }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()

    // Verwijder alle sessies van de gebruiker
    await admin.from('chat_sessions').delete().eq('user_id', user.id)

    // Verwijder alle klantprofielen van de gebruiker
    await admin.from('client_profiles').delete().eq('user_id', user.id)

    // Verwijder het Supabase auth-account zelf
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
    if (deleteErr) throw deleteErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/account]', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Er ging iets mis bij het verwijderen. Probeer het opnieuw.' },
      { status: 500 }
    )
  }
}
