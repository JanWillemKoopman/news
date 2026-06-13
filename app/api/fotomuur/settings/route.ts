import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { createRawAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Lees sessie uit cookie (geen extra netwerkrequest)
  const serverClient = createClient()
  const { data: { session }, error: sessionError } = await serverClient.auth.getSession()

  if (sessionError || !session?.access_token) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const body = await req.json()
  const { weddingId, isActive, title, moderationRequired, requireName, guestsCanDownload } = body

  if (!weddingId) {
    return NextResponse.json({ error: 'weddingId ontbreekt' }, { status: 400 })
  }

  // Controleer lidmaatschap via de gebruikers-token (RLS doet de autorisatie).
  // Door de access_token door te sturen werkt is_wedding_member() correct
  // zonder dat we zelf de user_id hoeven te vergelijken.
  const userClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const { data: member, error: memberError } = await userClient
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (memberError) {
    return NextResponse.json({ error: `Ledfout: ${memberError.message}` }, { status: 500 })
  }

  if (!member) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  // Instellingen opslaan via de admin-client (omzeilt de restrictieve RLS op
  // photo_wall_settings zodat zowel INSERT als UPDATE altijd slagen)
  const admin = createRawAdminClient()
  const { data, error } = await admin
    .from('photo_wall_settings')
    .upsert(
      {
        wedding_id: weddingId,
        is_active: isActive ?? false,
        title: title ?? "Foto's van onze bruiloft",
        moderation_required: moderationRequired ?? false,
        require_name: requireName ?? false,
        guests_can_download: guestsCanDownload ?? true,
      },
      { onConflict: 'wedding_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: `Opslaan mislukt: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ data })
}
