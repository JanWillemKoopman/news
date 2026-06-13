import { NextResponse } from 'next/server'

import { createRawAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Lees sessie uit cookie (geen extra netwerkrequest naar Supabase Auth)
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const { weddingId, isActive, title, moderationRequired, requireName, guestsCanDownload } = body

  if (!weddingId) return NextResponse.json({ error: 'Missing weddingId' }, { status: 400 })

  // Controleer of de gebruiker lid is van deze bruiloft
  const admin = createRawAdminClient()
  const { data: member } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })

  const { data, error } = await admin
    .from('photo_wall_settings')
    .upsert({
      wedding_id: weddingId,
      is_active: isActive ?? false,
      title: title ?? "Foto's van onze bruiloft",
      moderation_required: moderationRequired ?? false,
      require_name: requireName ?? false,
      guests_can_download: guestsCanDownload ?? true,
    }, { onConflict: 'wedding_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
