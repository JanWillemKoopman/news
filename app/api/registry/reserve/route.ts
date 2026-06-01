import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import {
  renderRegistryReservationGuestEmail,
  renderRegistryNewReservationCoupleEmail,
} from '@/lib/email/templates'
import { getResend, FROM_ADDRESS } from '@/lib/email/resend'

const bodySchema = z.object({
  item_id: z.string().uuid(),
  guest_name: z.string().min(1).max(200),
  guest_email: z.string().email(),
  message: z.string().max(1000).optional().default(''),
  wedding_slug: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { item_id, guest_name, guest_email, message, wedding_slug } = parsed.data
  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  // Validate item exists
  const { data: item } = await rawAdmin
    .from('registry_items')
    .select('id, type, title, is_visible, wedding_id, shop_url')
    .eq('id', item_id)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })
  if (item.type !== 'gift') return NextResponse.json({ error: 'Alleen cadeauwensen kunnen worden gereserveerd' }, { status: 400 })
  if (!item.is_visible) return NextResponse.json({ error: 'Item niet beschikbaar' }, { status: 400 })

  // Verify slug matches wedding
  const { data: content } = await admin
    .from('website_content')
    .select('wedding_id')
    .eq('slug', wedding_slug)
    .maybeSingle()
  if (!content || content.wedding_id !== item.wedding_id) {
    return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })
  }

  // Check not already reserved
  const { data: existing } = await rawAdmin
    .from('registry_reservations')
    .select('id')
    .eq('item_id', item_id)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Dit cadeau is al gereserveerd' }, { status: 409 })

  // Create reservation
  const { data: reservation, error: resError } = await rawAdmin
    .from('registry_reservations')
    .insert({ item_id, guest_name, guest_email, message: message || null })
    .select()
    .single()

  if (resError || !reservation) {
    console.error('[registry/reserve] Insert error:', resError)
    return NextResponse.json({ error: 'Reservering mislukt' }, { status: 500 })
  }

  // Get wedding info for emails
  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam, trouwdatum')
    .eq('id', item.wedding_id)
    .single()

  const coupleNames = wedding
    ? `${wedding.partner1_naam} & ${wedding.partner2_naam}`
    : 'het bruidspaar'

  const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/registry/cancel-reservation?token=${reservation.cancel_token}`
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bruiloft/cadeaulijst`

  const resend = getResend()
  const emailPromises: Promise<unknown>[] = [
    resend.emails.send({
      from: FROM_ADDRESS,
      to: guest_email,
      subject: `Je hebt een cadeau gereserveerd voor ${coupleNames}`,
      html: renderRegistryReservationGuestEmail({
        guestName: guest_name,
        itemTitle: item.title,
        coupleNames,
        weddingDate: wedding?.trouwdatum ?? null,
        shopUrl: item.shop_url ?? null,
        cancelUrl,
      }),
    }),
  ]

  const { data: members } = await admin
    .from('wedding_members')
    .select('user_id')
    .eq('wedding_id', item.wedding_id)
    .eq('role', 'owner')
  if (members?.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('email')
      .in('id', members.map((m) => m.user_id))
    for (const p of profiles ?? []) {
      emailPromises.push(
        resend.emails.send({
          from: FROM_ADDRESS,
          to: p.email ?? '',
          subject: 'Nieuw cadeau gereserveerd op jullie cadeaulijst',
          html: renderRegistryNewReservationCoupleEmail({
            guestName: guest_name,
            itemTitle: item.title,
            dashboardUrl,
          }),
        })
      )
    }
  }

  await Promise.allSettled(emailPromises)

  return NextResponse.json({ success: true })
}
