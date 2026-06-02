import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  token: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }
  const { token } = parsed.data

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: reservation } = await rawAdmin
    .from('registry_reservations')
    .select('item_id')
    .eq('cancel_token', token)
    .maybeSingle()

  if (!reservation) {
    return NextResponse.json({ error: 'Reservering niet gevonden' }, { status: 404 })
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

  return NextResponse.json({ success: true, slug })
}
