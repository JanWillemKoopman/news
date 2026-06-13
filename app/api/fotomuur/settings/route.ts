import { NextResponse } from 'next/server'

import { createRawAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Controleer authenticatie
  const supabaseAuth = createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { weddingId, isActive, title, moderationRequired, requireName, guestsCanDownload } = body

  if (!weddingId) return NextResponse.json({ error: 'Missing weddingId' }, { status: 400 })

  // Controleer of de gebruiker lid is van deze bruiloft
  const supabase = createRawAdminClient()
  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
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
