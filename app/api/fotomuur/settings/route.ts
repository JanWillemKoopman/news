import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Sessie uit cookie lezen (geen extra netwerkrequest naar Supabase Auth)
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

  // Client met de access_token van de gebruiker in de Authorization-header.
  // PostgREST gebruikt de JWT om auth.uid() en de 'authenticated' role te bepalen,
  // waardoor alle RLS-policies correct werken zonder de service-role key.
  const userClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Lidmaatschapscheck via is_wedding_member() RPC (gebruikt intern auth.uid())
  const { data: isMember, error: memberError } = await userClient
    .rpc('is_wedding_member', { p_wedding: weddingId })

  if (memberError) {
    return NextResponse.json({ error: `Ledfout: ${memberError.message}` }, { status: 500 })
  }

  if (!isMember) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  // Upsert via dezelfde user-client. RLS-policies:
  //   INSERT: pws_insert_members → is_wedding_member() → true voor leden ✓
  //   UPDATE (on conflict): pws_update_edit → can_edit('website') → true voor eigenaars ✓
  const { data, error } = await userClient
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
