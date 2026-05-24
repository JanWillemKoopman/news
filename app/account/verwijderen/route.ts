import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// AVG: verwijdert het account van de ingelogde gebruiker. Bruiloften waarvan
// de gebruiker de enige owner is, worden meeverwijderd (cascade ruimt alle
// gasten/taken/budget enz. op). Vereist de service-role (admin) en draait
// daarom server-side.
export async function POST() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Bruiloften waarvan deze gebruiker owner is.
  const { data: ownerships } = await admin
    .from('wedding_members')
    .select('wedding_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  for (const o of ownerships ?? []) {
    // Alleen verwijderen als er geen mede-owner is.
    const { count } = await admin
      .from('wedding_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('wedding_id', o.wedding_id)
      .eq('role', 'owner')
      .neq('user_id', user.id)
    if (!count) {
      await admin.from('weddings').delete().eq('id', o.wedding_id)
    }
  }

  // Account verwijderen (cascade ruimt profiel + resterende lidmaatschappen op).
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
