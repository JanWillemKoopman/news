import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: reservation } = await rawAdmin
    .from('registry_reservations')
    .select('item_id')
    .eq('cancel_token', token)
    .maybeSingle()

  if (!reservation) {
    return NextResponse.redirect(new URL('/?geannuleerd=onbekend', request.url))
  }

  const { data: item } = await rawAdmin
    .from('registry_items')
    .select('wedding_id')
    .eq('id', reservation.item_id)
    .single()

  let slug: string | null = null
  if (item) {
    const { data: content } = await admin
      .from('website_content')
      .select('slug')
      .eq('wedding_id', item.wedding_id)
      .maybeSingle()
    slug = content?.slug ?? null
  }

  await rawAdmin
    .from('registry_reservations')
    .delete()
    .eq('cancel_token', token)

  if (slug) {
    return NextResponse.redirect(new URL(`/trouwen/${slug}?geannuleerd=1`, request.url))
  }
  return NextResponse.redirect(new URL('/?geannuleerd=1', request.url))
}
