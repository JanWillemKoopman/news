import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/supabase/authz'
import { createClient } from '@/lib/supabase/server'

// Geeft per lid terug of het account al geactiveerd is (ingelogd / e-mail
// bevestigd). Hiermee toont de UI een "nog niet geactiveerd"-label en een
// knop om de uitnodiging opnieuw te versturen. Alleen voor de eigenaar.
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const weddingId = request.nextUrl.searchParams.get('weddingId') ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(weddingId)) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || membership.role !== 'owner') {
    if (!(await isPlatformAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
    }
  }

  const { data: members } = await admin
    .from('wedding_members')
    .select('user_id')
    .eq('wedding_id', weddingId)

  const statuses: Record<string, { activated: boolean }> = {}
  await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id)
      const u = data?.user
      statuses[m.user_id] = { activated: !!(u?.last_sign_in_at || u?.email_confirmed_at) }
    })
  )

  return NextResponse.json({ statuses })
}
